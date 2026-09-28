import { useEffect, useState } from "react";
import "./App.css";
import EmotionUniverse from "./EmotionUniverse";
import Auth from "./Auth";

function PinModal({ mode, onClose, onSubmit, error, busy }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const isCreate = mode === "create";

  const submit = (e) => {
    e.preventDefault();

    if (busy) return;

    if (isCreate && pin !== confirmPin) {
      onSubmit(null, "PINs do not match.");
      return;
    }

    onSubmit(pin, "");
  };

  return (
    <div className="pin-overlay">
      <form className="pin-card" onSubmit={submit}>
        <h3>{isCreate ? "Create a Memory PIN" : "Enter Memory PIN"}</h3>

        <p className="pin-sub">
          {isCreate
            ? "This PIN protects locked memories. Use it again to unlock."
            : "Enter your PIN to continue."}
        </p>

        <input
          className="pin-input"
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          autoFocus
        />

        {isCreate && (
          <input
            className="pin-input"
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="Confirm PIN"
          />
        )}

        {error && <div className="pin-error">{error}</div>}

        <div className="pin-actions">
          <button
            type="button"
            className="pin-cancel"
            onClick={onClose}
          >
            Cancel
          </button>

          <button type="submit" className="pin-submit" disabled={busy}>
            {busy ? "Checking..." : isCreate ? "Set PIN" : "Unlock"}
          </button>
        </div>
      </form>
    </div>
  );
}

function App() {
  const [userId, setUserId] = useState(
    localStorage.getItem("ev_user") || ""
  );

  const [message, setMessage] = useState("");
  const [emotion, setEmotion] = useState("");
  const [confidence, setConfidence] = useState(null);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showMemory, setShowMemory] = useState(false);

  // PIN state
  const [hasPin, setHasPin] = useState(false);
  const [pinModal, setPinModal] = useState(null); // "create" | "enter"
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  // Action to run once the PIN is verified
  const [pendingAction, setPendingAction] = useState(null);

  const loadHistory = async () => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/emotions/${userId}`);

      if (!res.ok) {
        console.error("History API error:", res.status);
        return;
      }

      const data = await res.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error("History fetch failed:", error);
    }
  };

  const loadPinStatus = async () => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/memory/pin/status/${userId}`);
      const data = await res.json();
      setHasPin(Boolean(data.hasPin));
    } catch (error) {
      console.error("PIN status failed:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      loadHistory();
      loadPinStatus();
    }
  }, [userId]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    setLoading(true);
    setResponse("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message }),
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

  const handleLogout = async () => {
    const token = localStorage.getItem("ev_token");

    try {
      await fetch("/api/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    localStorage.removeItem("ev_token");
    localStorage.removeItem("ev_user");

    setUserId("");
    setHistory([]);
    setEmotion("");
    setConfidence(null);
    setResponse("");
    setMessage("");
    setShowMemory(false);
    setHasPin(false);
  };

  // ---- PIN-protected actions ----

  const runToggleLock = async (recordId, pin) => {
    const res = await fetch(
      `/api/emotions/${userId}/${recordId}/lock`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not update lock.");
    }

    loadHistory();
  };

  const runDelete = async (recordId, pin) => {
    const res = await fetch(
      `/api/emotions/${userId}/${recordId}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || "Could not delete memory.");
    }

    loadHistory();
  };

  const toggleMemoryLock = (recordId) => {
    setPinError("");

    setPendingAction({
      type: hasPin ? "enter" : "create",
      run: (pin) => runToggleLock(recordId, pin),
    });

    setPinModal(hasPin ? "enter" : "create");
  };

  const deleteMemory = (recordId) => {
    const ok = window.confirm(
      "Delete this memory? This cannot be undone."
    );

    if (!ok) return;

    setPinError("");

    setPendingAction({
      type: hasPin ? "enter" : "create",
      run: (pin) => runDelete(recordId, pin),
    });

    setPinModal(hasPin ? "enter" : "create");
  };

  const handlePinSubmit = async (pin, clientError) => {
    if (clientError) {
      setPinError(clientError);
      return;
    }

    if (!pin || pin.length < 4) {
      setPinError("PIN must be at least 4 digits.");
      return;
    }

    if (!/^\d+$/.test(pin)) {
      setPinError("PIN must contain only digits.");
      return;
    }

    setPinBusy(true);
    setPinError("");

    try {
      if (pinModal === "create") {
        const res = await fetch("/api/memory/pin/set", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, pin }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || "Could not save PIN.");
        }

        setHasPin(true);
      } else {
        const res = await fetch("/api/memory/pin/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, pin }),
        });

        if (!res.ok) {
          throw new Error("Incorrect PIN.");
        }
      }

      // Run whatever the PIN was requested for
      if (pendingAction && pendingAction.run) {
        await pendingAction.run(pin);
      }

      setPinModal(null);
      setPendingAction(null);
    } catch (error) {
      setPinError(error.message || "Something went wrong.");
    } finally {
      setPinBusy(false);
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

  if (!userId) {
    return <Auth onLoggedIn={setUserId} />;
  }

  return (
    <div className="app">
      <EmotionUniverse
        key={`${userId}-${emotion || "neutral"}-${history.length}`}
        emotion={emotion}
        history={history}
      />

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

        <div className="top-right">
          <button
            type="button"
            className={`memory-toggle ${showMemory ? "active" : ""}`}
            onClick={() => setShowMemory((v) => !v)}
          >
            ◈ Memory
          </button>

          <div className="user-pill">
            <span className="user-dot"></span>
            {userId}
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
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
                        style={{ width: `${confidence * 100}%` }}
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
          </div>
        </section>

        <div className="universe-label">
          <span>EMOTION</span>
          <strong>{emotion || "NEUTRAL"}</strong>
          <small>YOUR EMOTIONAL UNIVERSE</small>
        </div>
      </main>

      <aside className={`memory-sidebar ${showMemory ? "open" : ""}`}>
        <div className="memory-header">
          <div>
            <h4>Long-Term Emotion Memory</h4>
            <p>
              {history.length} recorded moments ·{" "}
              {history.filter((h) => h.locked).length} locked
            </p>
          </div>

          <button
            type="button"
            className="memory-close"
            onClick={() => setShowMemory(false)}
          >
            ×
          </button>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            className="memory-clear"
            onClick={() => {
              const ok = window.confirm(
                "Delete all UNLOCKED memories? Locked ones will be kept."
              );

              if (!ok) return;

              setPinError("");

              setPendingAction({
                type: "enter",
                run: async () => {
                  const res = await fetch(
                    `/api/emotions/${userId}`,
                    { method: "DELETE" }
                  );

                  if (!res.ok) {
                    throw new Error("Could not clear memories.");
                  }

                  loadHistory();
                },
              });

              setPinModal("enter");
            }}
          >
            Clear all unlocked
          </button>
        )}

        <div className="memory-list">
          {history.length === 0 && (
            <div className="memory-empty">
              No emotional memory yet. Send a message to begin
              your journey.
            </div>
          )}

          {history.map((item, index) => (
            <div
              className={`memory-item ${item.locked ? "locked" : ""}`}
              key={item._id || index}
            >
              <div className="memory-item-top">
                <span className="memory-emotion">
                  {getEmotionEmoji(item.emotion)} {item.emotion}
                </span>

                <div className="memory-actions">
                  <button
                    type="button"
                    className={`memory-lock ${item.locked ? "on" : ""}`}
                    title={
                      item.locked
                        ? "Unlock this memory (PIN needed)"
                        : "Lock this memory (PIN needed)"
                    }
                    onClick={() => toggleMemoryLock(item._id)}
                  >
                    {item.locked ? "🔒" : "🔓"}
                  </button>

                  <button
                    type="button"
                    className="memory-delete"
                    title={
                      item.locked
                        ? "Locked — unlock to delete"
                        : "Delete this memory (PIN needed)"
                    }
                    disabled={item.locked}
                    onClick={() => deleteMemory(item._id)}
                  >
                    🗑
                  </button>
                </div>
              </div>

              <div className="memory-time">
                {formatTimestamp(item.timestamp)}
              </div>

              {item.message && (
                <div className="memory-message">{item.message}</div>
              )}

              {typeof item.confidence === "number" && (
                <div className="memory-confidence">
                  <div className="memory-confidence-top">
                    <span>Confidence</span>
                    <span>{(item.confidence * 100).toFixed(1)}%</span>
                  </div>

                  <div className="memory-confidence-bar">
                    <div
                      className="memory-confidence-fill"
                      style={{ width: `${item.confidence * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {item.response && (
                <div className="memory-response">
                  <span className="memory-response-label">AI: </span>
                  {item.response}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {pinModal && (
        <PinModal
          mode={pinModal}
          busy={pinBusy}
          error={pinError}
          onClose={() => {
            setPinModal(null);
            setPendingAction(null);
            setPinError("");
          }}
          onSubmit={handlePinSubmit}
        />
      )}

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
