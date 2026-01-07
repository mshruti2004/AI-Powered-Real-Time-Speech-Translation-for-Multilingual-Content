import { useRef, useState } from "react";

export default function AudioRecorder() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordingTimeoutRef = useRef(null);

  const [audioBlob, setAudioBlob] = useState(null);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [language, setLanguage] = useState("mr");

  // 🔴 RECORDING LOGIC — UNCHANGED
  const startRecording = async () => {
    try {
      if (recording) return;

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
        mimeType: "audio/webm",
        audioBitsPerSecond: 128000,
      });

      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setStatus("⏳ Processing audio on FastAPI backend...");
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      setStatus("🎙 Recording (max 20 seconds)");

      recordingTimeoutRef.current = setTimeout(stopRecording, 20000);
    } catch {
      setStatus("❌ Microphone permission denied");
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    mediaRecorderRef.current.stop();
    streamRef.current.getTracks().forEach((t) => t.stop());
    setRecording(false);
    clearTimeout(recordingTimeoutRef.current);
  };

  const sendAudio = async () => {
    if (!audioBlob) return;

    setStatus("🚀 Uploading audio to FastAPI...");
    const formData = new FormData();
    formData.append("audio", audioBlob);
    formData.append("target_lang", language);

    const res = await fetch("http://localhost:8000/translate", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.error) {
      setStatus("❌ Only English & Hindi supported as input");
      return;
    }

    setDetectedLang(data.detected_language);
    setOriginalText(data.original_text);
    setTranslatedText(data.translated_text);
    setAudioUrl(data.audio_url);
    setStatus("✅ Translation completed successfully");
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <h1>AI Speech Translator</h1>
        <p>FastAPI • Whisper • Neural Translation • TTS</p>
      </header>

      {/* MAIN CARD */}
      <div style={styles.card}>
        <h2>🎤 Record & Translate Speech</h2>

        <select value={language} onChange={(e) => setLanguage(e.target.value)} style={styles.select}>
          <option value="mr">Marathi</option>
          <option value="hi">Hindi</option>
          <option value="ta">Tamil</option>
          <option value="te">Telugu</option>
          <option value="bn">Bengali</option>
          <option value="gu">Gujarati</option>
          <option value="kn">Kannada</option>
          <option value="ml">Malayalam</option>
          <option value="pa">Punjabi</option>
          <option value="ur">Urdu</option>
          <option value="or">Odia</option>
          <option value="as">Assamese</option>
        </select>

        <div style={styles.controls}>
          {!recording ? (
            <button style={styles.startBtn} onClick={startRecording}>🎙 Start</button>
          ) : (
            <button style={styles.stopBtn} onClick={stopRecording}>⏹ Stop</button>
          )}

          <button style={styles.translateBtn} onClick={sendAudio} disabled={!audioBlob}>
            🌍 Translate
          </button>
        </div>

        <div style={styles.statusBox}>{status}</div>

        {originalText && (
          <div style={styles.resultBox}>
            <h4>Original Speech ({detectedLang})</h4>
            <p>{originalText}</p>
          </div>
        )}

        {translatedText && (
          <div style={styles.resultBox}>
            <h4>Translated Text</h4>
            <p>{translatedText}</p>
          </div>
        )}

        {audioUrl && <audio controls src={audioUrl} style={{ width: "100%", marginTop: "10px" }} />}
      </div>

      {/* FOOTER / INFO */}
      <footer style={styles.footer}>
        
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#e5e7eb",
    fontFamily: "Segoe UI, sans-serif",
  },
  header: {
    textAlign: "center",
    padding: "30px",
    background: "#020617",
  },
  card: {
    background: "#020617",
    maxWidth: "480px",
    margin: "30px auto",
    padding: "25px",
    borderRadius: "12px",
    boxShadow: "0 0 30px rgba(0,0,0,0.6)",
  },
  select: {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "6px",
  },
  controls: {
    display: "flex",
    gap: "10px",
    marginBottom: "10px",
  },
  startBtn: { flex: 1, padding: "10px", background: "#22c55e", border: "none" },
  stopBtn: { flex: 1, padding: "10px", background: "#ef4444", border: "none" },
  translateBtn: { flex: 1, padding: "10px" },
  statusBox: {
    marginTop: "10px",
    padding: "8px",
    background: "#020617",
    borderRadius: "6px",
  },
  resultBox: {
    background: "#020617",
    marginTop: "10px",
    padding: "10px",
    borderRadius: "8px",
  },
  footer: {
    textAlign: "center",
    padding: "20px",
    fontSize: "14px",
    opacity: 0.8,
  },
};
