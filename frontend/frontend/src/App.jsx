import { useEffect, useState } from "react";
import "./App.css";
import EmotionUniverse from "./EmotionUniverse";

function App() {
  const [message, setMessage] = useState("");
  const [emotion, setEmotion] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const userId = "swetha";

  // Fetch emotion history separately
  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/emotions/${userId}`);

      if (!res.ok) {
        console.error("History API error:", res.status);
        return;
      }

      const data = await res.json();

      // Backend returns an OBJECT: { userId, history: [...] }
      setHistory(data.history || []);
    } catch (error) {
      console.error("History fetch failed:", error);
    }
  };

  // Load previous emotions when app starts
  useEffect(() => {
    loadHistory();
  }, []);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          message: message,
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat API error: ${res.status}`);
      }

      const data = await res.json();

      setEmotion(data.emotion);
      setConfidence(data.confidence);
      setResponse(data.response);

      setMessage("");

      loadHistory();
    } catch (error) {
      console.error("Chat error:", error);

      setResponse("Backend connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getEmotionEmoji = (emotionName) => {
    switch (emotionName?.toLowerCase()) {
      case "joy":
        return "✨";
      case "sadness":
        return "💙";
      case "anger":
        return "🔥";
      case "fear":
        return "🌙";
      case "surprise":
        return "⚡";
      case "disgust":
        return "🌿";
      case "neutral":
        return "☁️";
      default:
        return "🌌";
    }
  };

  // Format in India Standard Time (Asia/Kolkata)
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return String(timestamp);
    }

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="app">
      <EmotionUniverse key={emotion || "neutral"} emotion={emotion} />

      <div className="galaxy-overlay"></div>

      <header className="top-bar">
        <div className="brand">
          <div className="brand-orbit">
            <span></span>
          </div>

          <div>
            <h1>EmotionVerse AI</h1>
            <p>Emotion-Aware Intelligent Chatbot</p>
          </div>
        </div>

        <div className="status-pill">
          <span className="status-dot"></span>
          AI ONLINE
        </div>
      </header>

      <main className="experience">
        <section className="chat-panel">
          <div className="chat-card">
            <div className="card-glow"></div>

            <div className="chat-header">
              <div className="ai-avatar">✦</div>

              <div>
                <h3>EmotionVerse Companion</h3>
                <p>Understanding you, one message at a time</p>
              </div>
            </div>

            {response && (
              <div className="response-area">
                <div className="emotion-badge">
                  <span className="emotion-icon">
                    {getEmotionEmoji(emotion)}
                  </span>

                  <div>
                    <small>DETECTED EMOTION</small>
                    <strong>{emotion}</strong>
                  </div>
                </div>

                {confidence !== null && (
                  <div className="confidence">
                    <div className="confidence-top">
                      <span>Confidence</span>

                      <span>{(confidence * 100).toFixed(1)}%</span>
                    </div>

                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${confidence * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="ai-message">
                  <div className="message-label">AI RESPONSE</div>

                  <p>{response}</p>
                </div>
              </div>
            )}

            <div className="input-area">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="How are you feeling today?"
                rows="3"
              />

              <div className="input-bottom">
                <span className="hint">Enter to send</span>

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading || !message.trim()}
                >
                  {loading ? (
                    <>
                      <span className="loader"></span>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Send
                      <span className="send-icon">→</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Long-Term Emotion Memory */}
            {history.length > 0 && (
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "14px",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Pinned title */}
                <div
                  style={{
                    fontSize: "11px",
                    letterSpacing: "2px",
                    color: "rgba(255,255,255,0.5)",
                    marginBottom: "10px",
                  }}
                >
                  LONG-TERM EMOTION MEMORY
                </div>

                {/* Scrollable list — keeps the chat input visible */}
                <div
                  style={{
                    maxHeight: "340px",
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {history
                    .slice()
                    .map((item, index) => (
                      <div
                        key={item._id || index}
                        style={{
                          padding: "12px 13px",
                          marginBottom: "9px",
                          borderRadius: "10px",
                          background: "rgba(255,255,255,0.035)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {/* Row 1: emotion + timestamp */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                            }}
                          >
                            {getEmotionEmoji(item.emotion)} {item.emotion}
                          </span>

                          <span
                            style={{
                              fontSize: "10px",
                              color: "rgba(255,255,255,0.45)",
                            }}
                          >
                            {formatTimestamp(item.timestamp)}
                          </span>
                        </div>

                        {/* Row 2: user message */}
                        {item.message && (
                          <div
                            style={{
                              marginTop: "7px",
                              fontSize: "12px",
                              color: "rgba(255,255,255,0.7)",
                            }}
                          >
                            {item.message}
                          </div>
                        )}

                        {/* Row 3: confidence bar */}
                        {typeof item.confidence === "number" && (
                          <div style={{ marginTop: "8px" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "10px",
                                color: "rgba(255,255,255,0.45)",
                                marginBottom: "3px",
                              }}
                            >
                              <span>Confidence</span>
                              <span>
                                {(item.confidence * 100).toFixed(1)}%
                              </span>
                            </div>

                            <div
                              style={{
                                height: "4px",
                                borderRadius: "4px",
                                background: "rgba(255,255,255,0.08)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${item.confidence * 100}%`,
                                  borderRadius: "4px",
                                  background:
                                    "linear-gradient(90deg, rgba(140,120,255,0.9), rgba(90,200,255,0.9))",
                                }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Row 4: AI response (clamped to 2 lines) */}
                        {item.response && (
                          <div
                            style={{
                              marginTop: "8px",
                              fontSize: "12px",
                              color: "rgba(255,255,255,0.8)",
                              lineHeight: "1.4",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            <span
                              style={{
                                color: "rgba(255,255,255,0.45)",
                              }}
                            >
                              AI:{" "}
                            </span>
                            {item.response}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="universe-label">
          <span>EMOTION</span>

          <strong>{emotion || "NEUTRAL"}</strong>

          <small>YOUR EMOTIONAL UNIVERSE</small>
        </div>
      </main>

      <footer className="bottom-bar">
        <span>Powered by ModernBERT</span>

        <span className="separator">•</span>

        <span>7 Emotion Universe</span>

        <span className="separator">•</span>

        <span>Three.js</span>
      </footer>
    </div>
  );
}

export default App;
