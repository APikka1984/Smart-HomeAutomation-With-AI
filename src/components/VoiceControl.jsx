import React, { useState, useRef, useEffect } from "react";

export default function VoiceControl({ onCommand }) {
  const [listening, setListening] = useState(false);
  const [last, setLast] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!recognitionRef.current && SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.lang = "en-IN";
      recog.interimResults = false;
      recog.continuous = false;

      recog.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setLast(text);
        onCommand?.(text);
        setListening(false);
      };

      recog.onerror = (err) => {
        console.error("Speech error:", err);
        setListening(false);
      };

      recog.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recog;
    }
    // cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.onresult = null; } catch {}
      }
    };
  }, [onCommand]);

  const startListening = () => {
    if (!recognitionRef.current) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }
    try {
      setListening(true);
      recognitionRef.current.start();
    } catch (err) {
      console.error("startListening error:", err);
      setListening(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow text-center">
      <h3 className="font-semibold mb-2">Voice Control</h3>
      <button
        onClick={startListening}
        disabled={listening}
        className={`px-4 py-2 rounded text-white ${
          listening ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {listening ? "Listening..." : "Start Voice Command"}
      </button>

      {last && (
        <div className="mt-3 text-sm text-gray-700">
          <div className="text-xs text-gray-400">Last command</div>
          <div className="font-medium">{last}</div>
        </div>
      )}
    </div>
  );
}
