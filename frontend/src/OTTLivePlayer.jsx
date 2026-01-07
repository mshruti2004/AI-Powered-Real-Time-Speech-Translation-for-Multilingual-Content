import React, { useState, useRef } from "react";
import Hls from "hls.js";

const LANGUAGES = [
  { code: "mr", label: "Marathi" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "bn", label: "Bengali" },
  { code: "gu", label: "Gujarati" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "pa", label: "Punjabi" },
  { code: "ur", label: "Urdu" },
];

export default function OTTLivePlayer() {
  const [url, setUrl] = useState("");
  const [lang, setLang] = useState("hi");
  const [subtitles, setSubtitles] = useState([]);

  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  const playStream = () => {
    if (!Hls.isSupported()) {
      videoRef.current.src = url;
      return;
    }
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(videoRef.current);
  };

  // 🔊 Play audio sequentially (NO overlap)
  const playNextAudio = () => {
    if (isPlayingRef.current) return;
    if (audioQueueRef.current.length === 0) return;

    const audio = audioQueueRef.current.shift();
    isPlayingRef.current = true;

    audio.play();
    audio.onended = () => {
      isPlayingRef.current = false;
      playNextAudio();
    };
  };

  const startOTT = () => {
    if (!url) return alert("⚠️ Enter a valid .m3u8 OTT URL first");

    setSubtitles([]);
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    playStream();

    wsRef.current = new WebSocket("ws://localhost:8000/ws-ott");

    wsRef.current.onopen = () => {
      wsRef.current.send(JSON.stringify({ url, lang }));
    };

    wsRef.current.onmessage = (event) => {
      try {
        const json = JSON.parse(event.data);

        // 📝 Subtitle
        if (json.event === "subtitle") {
          setSubtitles((prev) => [...prev.slice(-10), json.text]);
        }

        // 🔊 Audio
        if (json.event === "audio") {
          const audio = new Audio(
            "data:audio/mp3;base64," + json.data
          );
          audioQueueRef.current.push(audio);
          playNextAudio();
        }
      } catch (err) {
        console.error("WS error:", err);
      }
    };

    wsRef.current.onerror = (e) => {
      console.error("WebSocket error", e);
    };
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>📺 OTT Live Subtitle + Audio Translator</h2>

      <input
        type="text"
        placeholder="Enter OTT Live URL (.m3u8)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: "350px", padding: 6, marginRight: 10 }}
      />

      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        style={{ padding: 6 }}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>

      <button
        onClick={startOTT}
        style={{ marginLeft: 12, padding: "6px 12px" }}
      >
        ▶ Start Translation
      </button>

      <video
        ref={videoRef}
        controls
        autoPlay
        muted={false}
        style={{
          width: "100%",
          maxWidth: 900,
          height: 520,
          borderRadius: 12,
          marginTop: 20,
        }}
      />

      {/* Subtitle Box */}
      <div
        style={{
          width: 600,
          height: 150,
          background: "#000",
          color: "white",
          padding: 10,
          marginTop: 20,
          overflowY: "auto",
          fontSize: 18,
          borderRadius: 8,
        }}
      >
        {subtitles.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}
