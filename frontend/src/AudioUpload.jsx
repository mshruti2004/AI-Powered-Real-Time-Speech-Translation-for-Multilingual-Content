import { useState } from "react";

export default function AudioUpload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [language, setLanguage] = useState("mr");
  const [detectedLang, setDetectedLang] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setStatus("❌ Please upload audio first");
      return;
    }

    setStatus("🚀 Uploading to FastAPI...");
    const formData = new FormData();
    formData.append("audio", file);
    formData.append("target_lang", language);

    try {
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
      setStatus("✅ Translation Completed");
    } catch (err) {
      setStatus("❌ Server not reachable — is FastAPI running?");
    }
  };

  return (
    <div style={styles.container}>
      <h2>📁 Upload Audio for Translation</h2>

      {/* Language Select */}
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

      {/* File Upload */}
      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setFile(e.target.files[0])}
        style={styles.input}
      />

      <button style={styles.uploadBtn} onClick={handleUpload}>
        🌍 Translate Audio
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

// 🎨 Styles (same theme as recorder)
const styles = {
  container: {
    background: "#020617",
    padding: "25px",
    borderRadius: "12px",
    color: "#e5e7eb",
  },
  select: {
    width: "100%",
    padding: "10px",
    borderRadius: "6px",
    marginBottom: "15px",
  },
  input: {
    display: "block",
    marginBottom: "15px",
  },
  uploadBtn: {
    width: "100%",
    background: "#2563eb",
    padding: "12px",
    borderRadius: "8px",
    color: "white",
    border: "none",
    cursor: "pointer",
  },
  status: {
    marginTop: "10px",
    padding: "8px",
    minHeight: "20px",
  },
  box: {
    background: "#0f172a",
    padding: "12px",
    borderRadius: "8px",
    marginTop: "12px",
  },
};
