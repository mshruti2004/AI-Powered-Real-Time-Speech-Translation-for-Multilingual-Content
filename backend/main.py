import os
import uuid
import subprocess
import yt_dlp
import base64
import asyncio
from fastapi import FastAPI, File, Form, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from faster_whisper import WhisperModel
from gtts import gTTS
from deep_translator import GoogleTranslator
from pydub import AudioSegment

# =================== SETUP ===================
UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")

print("🧠 Loading Whisper Model ...")
model = WhisperModel("tiny", device="cpu", compute_type="int8")

SUPPORTED_INPUT = ["en", "hi"]

# =================== HELPERS ===================
def chunk_audio(path, minutes=1):
    audio = AudioSegment.from_file(path)
    length_ms = len(audio)
    chunk_length = minutes * 60 * 1000
    chunks = []
    for i in range(0, length_ms, chunk_length):
        chunk = audio[i:i + chunk_length]
        temp_path = f"{path}_{i}.wav"
        chunk.export(temp_path, format="wav")
        chunks.append(temp_path)
    return chunks

def translate_in_chunks(text, target_lang):
    CHUNK_SIZE = 4000
    result = ""
    for i in range(0, len(text), CHUNK_SIZE):
        chunk = text[i:i + CHUNK_SIZE]
        translated = GoogleTranslator(source="auto", target=target_lang).translate(chunk)
        result += translated + " "
    return result.strip()

# Helper to save TTS audio and return path
def save_tts(text, target_lang):
    file_id = uuid.uuid4().hex
    path = os.path.join(OUTPUT_DIR, f"{file_id}.mp3")
    gTTS(text=text, lang=target_lang).save(path)
    return path, file_id

# Helper to convert audio file to base64
def audio_to_base64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")

# =================== 1️⃣ AUDIO UPLOAD TRANSLATION ===================
@app.post("/translate")
async def translate(audio: UploadFile = File(...), target_lang: str = Form(...)):

    file_id = uuid.uuid4().hex
    webm_path = os.path.join(UPLOAD_DIR, f"{file_id}.webm")
    wav_path = os.path.join(UPLOAD_DIR, f"{file_id}.wav")

    # Save uploaded raw audio
    with open(webm_path, "wb") as f:
        f.write(await audio.read())

    # Convert WEBM → WAV
    subprocess.run([
        "ffmpeg", "-y", "-i", webm_path, "-ar", "16000", "-ac", "1", wav_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Speech-to-text
    segments, info = model.transcribe(wav_path, task="transcribe", vad_filter=True, beam_size=3)
    original_text = " ".join(seg.text for seg in segments).strip()
    detected_lang = info.language

    if detected_lang not in SUPPORTED_INPUT:
        return {"error": "❌ Only English & Hindi input is supported"}

    if not original_text:
        return {"error": "⚠️ No speech detected"}

    # Translate text
    translated_text = GoogleTranslator(source="auto", target=target_lang).translate(original_text)

    # TTS → save audio
    output_audio_path = os.path.join(OUTPUT_DIR, f"{file_id}.mp3")
    gTTS(text=translated_text, lang=target_lang).save(output_audio_path)

    # Cleanup
    os.remove(webm_path)
    os.remove(wav_path)

    return {
        "detected_language": detected_lang,
        "original_text": original_text,
        "translated_text": translated_text,
        "audio_url": f"http://localhost:8000/outputs/{file_id}.mp3"
    }

# =================== 2️⃣ YOUTUBE VIDEO TRANSLATION ===================
@app.post("/translate-youtube")
async def translate_youtube(
    youtube_url: str = Form(...),
    target_lang: str = Form(...)
):
    file_id = uuid.uuid4().hex

    # 1️⃣ Download full audio
    mp3_path = os.path.join(UPLOAD_DIR, f"{file_id}.mp3")
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": mp3_path
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_url])

    # 2️⃣ Convert to WAV (mono 16kHz)
    wav_path = os.path.join(UPLOAD_DIR, f"{file_id}.wav")
    audio = AudioSegment.from_file(mp3_path)
    audio = audio.set_channels(1).set_frame_rate(16000)
    audio.export(wav_path, format="wav")

    # 3️⃣ Chunking
    chunks = chunk_audio(wav_path, minutes=1)

    original_text = ""
    detected_lang_global = None

    for ch in chunks:
        segments, info = model.transcribe(ch, task="transcribe", vad_filter=True)
        original_text += " " + " ".join(seg.text for seg in segments).strip()
        detected_lang_global = info.language

    if detected_lang_global not in SUPPORTED_INPUT:
        return {"error": "❌ Only English & Hindi input supported"}

    # 4️⃣ Translate full text
    translated_text = translate_in_chunks(original_text, target_lang)

    # 5️⃣ TTS
    output_audio_path = os.path.join(OUTPUT_DIR, f"{file_id}.mp3")
    gTTS(text=translated_text, lang=target_lang).save(output_audio_path)

    # 6️⃣ Cleanup
    try:
        os.remove(mp3_path)
        os.remove(wav_path)
        for ch in chunks:
            os.remove(ch)
    except:
        pass

    # 7️⃣ Return Result
    return {
        "detected_language": detected_lang_global,
        "original_text": original_text.strip(),
        "translated_text": translated_text.strip(),
        "audio_url": f"http://localhost:8000/outputs/{file_id}.mp3"
    }

# =================== 3️⃣ OTT LIVE STREAMING (SUBTITLES + AUDIO) ===================
@app.websocket("/ws-ott")
async def ott_ws(websocket: WebSocket):
    await websocket.accept()
    proc = None

    try:
        data = await websocket.receive_json()
        url = data.get("url")
        target = data.get("lang")

        if not url or not target:
            await websocket.send_json({
                "event": "error",
                "text": "Missing url or language"
            })
            return

        # Start ffmpeg audio stream
        cmd = [
            "ffmpeg",
            "-loglevel", "quiet",
            "-i", url,
            "-vn",
            "-ac", "1",
            "-ar", "16000",
            "-f", "s16le",
            "pipe:1"
        ]

        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE)

        buffer = b""

        while True:
            await asyncio.sleep(0.01)  # keep websocket alive

            chunk = proc.stdout.read(32000)  # ~1 sec audio
            if not chunk:
                continue  # DO NOT break for live streams

            buffer += chunk

            # Process every ~3 seconds
            if len(buffer) >= 16000 * 2 * 3:
                audio_segment = AudioSegment(
                    data=buffer,
                    sample_width=2,
                    frame_rate=16000,
                    channels=1
                )
                buffer = b""

                tmp_wav = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}.wav")
                audio_segment.export(tmp_wav, format="wav")

                # Speech → Text
                segments, _ = model.transcribe(tmp_wav, vad_filter=True)
                os.remove(tmp_wav)

                text = " ".join(s.text for s in segments).strip()
                if not text:
                    continue

                # Translate
                translated = GoogleTranslator(
                    source="auto",
                    target=target
                ).translate(text)

                # 1️⃣ SEND SUBTITLE
                await websocket.send_json({
                    "event": "subtitle",
                    "text": translated
                })

                # 2️⃣ GENERATE & SEND AUDIO FOR SAME SUBTITLE
                tts_path, _ = save_tts(translated, target)
                with open(tts_path, "rb") as f:
                    audio_b64 = base64.b64encode(f.read()).decode("utf-8")

                await websocket.send_json({
                    "event": "audio",
                    "data": audio_b64
                })

                os.remove(tts_path)

    except WebSocketDisconnect:
        if proc:
            proc.kill()
        print("🔴 WebSocket disconnected")

