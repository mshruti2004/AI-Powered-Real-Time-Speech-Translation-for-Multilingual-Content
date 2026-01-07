import { useState } from "react";

export default function YouTubeTranslator() {
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState("mr");
  const [status, setStatus] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const handleTranslate = async () => {
    if (!url.trim()) {
      setStatus("❌ Please enter YouTube URL");
      return;
    }

    setStatus("🚀 Sending request to FastAPI...");
    const formData = new FormData();
    formData.append("youtube_url", url);
    formData.append("target_lang", language);

    try {
      const res = await fetch("http://localhost:8000/translate-youtube", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setStatus("❌ " + data.error);
        return;
      }

      setDetectedLang(data.detected_language);
      setOriginalText(data.original_text);
      setTranslatedText(data.translated_text);
      setAudioUrl(data.audio_url);
      setStatus("✅ YouTube Translation Completed");
    } catch (err) {
      setStatus("❌ Server not reachable — is FastAPI running?");
    }
  };

  return (
    <div style={styles.container}>
      <h2>🎥 Translate YouTube Video</h2>

      {/* Input URL */}
      <input
        type="text"
        placeholder="Paste YouTube link..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={styles.input}
      />

      {/* Language selector */}
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={styles.select}
      >
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

      <button style={styles.btn} onClick={handleTranslate}>
        🌍 Translate YouTube
      </button>

      {/* Status */}
      <div style={styles.status}>{status}</div>

      {/* Results */}
      {originalText && (
        <div style={styles.box}>
          <h4>🗣 Original Speech ({detectedLang})</h4>
          <p>{originalText}</p>
        </div>
      )}

      {translatedText && (
        <div style={styles.box}>
          <h4>🌐 Translated Text</h4>
          <p>{translatedText}</p>
        </div>
      )}

      {audioUrl && (
        <audio
          controls
          src={audioUrl}
          style={{ width: "100%", marginTop: "15px" }}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    background: "#020617",
    padding: "25px",
    borderRadius: "12px",
    color: "#e5e7eb",
    maxWidth: "500px",
    margin: "30px auto",
    boxShadow: "0 0 30px rgba(0,0,0,0.5)"
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    marginBottom: "15px",
    border: "1px solid #1e293b",
  },
  select: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    marginBottom: "15px",
  },
  btn: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    background: "#2563eb",
    border: "none",
    color: "white",
    cursor: "pointer",
  },
  status: {
    marginTop: "10px",
    padding: "8px",
    minHeight: "22px",
  },
  box: {
    background: "#0f172a",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "12px",
  },
};
