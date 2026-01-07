import { useState } from "react";
import AudioRecorder from "./AudioRecorder";
import AudioUpload from "./AudioUpload";
import YouTubeTranslator from "./YouTubeTranslator";
import OTTLivePlayer from "./OTTLivePlayer";  // LIVE OTT IMPORT

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("record");

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <h1 style={styles.logo}>🌐 AI Speech Translation</h1>
      </header>

      {/* TABS */}
      <div style={styles.tabs}>
        {["record", "audio", "youtube", "live"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tabButton,
              ...(activeTab === tab ? styles.activeTab : {}),
            }}
          >
            {tab === "record" && "🎙 Record Speech"}
            {tab === "audio" && "📁 Upload Audio"}
            {tab === "youtube" && "🔗 YouTube Translate"}
            {tab === "live" && "📡 OTT Live Player"}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={styles.content}>
        <div style={styles.card}>
          {activeTab === "record" && <AudioRecorder />}
          {activeTab === "audio" && <AudioUpload />}
          {activeTab === "youtube" && <YouTubeTranslator />}
          {activeTab === "live" && <OTTLivePlayer />}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={styles.footer}>© 2025 AI Translator • FastAPI • Whisper TI</footer>
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
    padding: "25px",
    fontSize: "22px",
    background: "#020617",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  logo: { margin: 0 },
  tabs: { display: "flex", justifyContent: "center", gap: "10px", padding: "10px" },
  tabButton: {
    background: "#1e293b",
    color: "#e5e7eb",
    border: "1px solid #334155",
    padding: "12px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.3s",
  },
  activeTab: {
    background: "#2563eb",
    borderColor: "#3b82f6",
    color: "white",
    transform: "scale(1.05)",
  },
  content: { display: "flex", justifyContent: "center", marginTop: "20px" },
  card: {
    width: "90%",
    maxWidth: "900px",
    background: "rgba(2, 6, 23, 0.8)",
    padding: "25px",
    borderRadius: "14px",
    boxShadow: "0 0 30px rgba(0,0,0,0.5)",
  },
  footer: {
    textAlign: "center",
    padding: "15px",
    fontSize: "14px",
    opacity: 0.5,
    marginTop: "20px",
  },
};
