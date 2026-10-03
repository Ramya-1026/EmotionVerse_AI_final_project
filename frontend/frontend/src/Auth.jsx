import { useState } from "react";
import "./App.css";

function Auth({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // "login" | "register" | "reset"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";
  const isReset = mode === "reset";

  const switchMode = () => {
    setMode(isLogin ? "register" : "login");
    setError("");
    setInfo("");
    setPin("");
  };

  const goToReset = () => {
    setMode("reset");
    setError("");
    setInfo("");
    setPin("");
    setPassword("");
  };

  const validate = () => {
    const name = username.trim();

    if (!name) {
      return "Please enter your username.";
    }

    if (name.length < 3) {
      return "Username must be at least 3 characters.";
    }

    if (isReset) {
      if (!pin || !/^\d+$/.test(pin) || pin.length < 4) {
        return "Enter your 4-digit memory PIN.";
      }

      if (!password || password.length < 4) {
        return "New password must be at least 4 characters.";
      }

      return "";
    }

    if (!password) {
      return "Please enter your password.";
    }

    if (password.length < 4) {
      return "Password must be at least 4 characters.";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const problem = validate();

    if (problem) {
      setError(problem);
      setInfo("");
      return;
    }

    setError("");
    setInfo("");
    setLoading(true);

    try {
      // ---- Password reset via memory PIN ----
      if (isReset) {
        const res = await fetch("/api/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            pin,
            newPassword: password,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success) {
          setInfo("Password changed. Please log in.");
          setMode("login");
          setPin("");
          setPassword("");
        } else {
          setError(data.detail || "Could not reset password.");
        }

        return;
      }

      // ---- Login / Register ----
      const res = await fetch(
        isLogin ? "/api/login" : "/api/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        }
      );

      const data = await res.json();

      if (!isLogin) {
        if (data.success) {
          setInfo("Account created! Please log in.");
          setMode("login");
          setPassword("");
        } else {
          setError(data.message || "Registration failed.");
        }
        return;
      }

      if (data.success && data.token) {
        localStorage.setItem("ev_token", data.token);
        localStorage.setItem(
          "ev_user",
          data.username || username.trim().toLowerCase()
        );
        onLoggedIn(data.username || username.trim().toLowerCase());
      } else {
        setError(data.message || "Login failed.");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Cannot reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="card-glow"></div>

        <div className="auth-brand">
          <div className="brand-orbit">
            <span></span>
          </div>

          <div>
            <h1>EmotionVerse AI</h1>
            <p>Emotion-Aware Intelligent Chatbot</p>
          </div>
        </div>

        <h2 className="auth-title">
          {isLogin
            ? "Welcome back"
            : isReset
            ? "Reset your password"
            : "Create your account"}
        </h2>

        <p className="auth-subtitle">
          {isLogin
            ? "Log in to continue your emotional universe"
            : isReset
            ? "Confirm your memory PIN to set a new password"
            : "Your emotional universe starts here"}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">Username</label>
          <input
            className="auth-input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            autoComplete="username"
          />

          {isReset && (
            <>
              <label className="auth-label">Memory PIN</label>
              <input
                className="auth-input"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter your 4-digit PIN"
              />
            </>
          )}

          <label className="auth-label">
            {isReset ? "New Password" : "Password"}
          </label>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              isReset ? "Enter a new password" : "Enter your password"
            }
            autoComplete={isLogin ? "current-password" : "new-password"}
          />

          {error && <div className="auth-error">{error}</div>}
          {info && <div className="auth-info">{info}</div>}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isReset
              ? "Set New Password"
              : isLogin
              ? "Log In"
              : "Create Account"}
          </button>
        </form>

        {isLogin && (
          <div className="auth-switch">
            <button type="button" onClick={goToReset}>
              Forgot password?
            </button>
          </div>
        )}

        {isReset ? (
          <div className="auth-switch">
            <button type="button" onClick={() => setMode("login")}>
              Back to log in
            </button>
          </div>
        ) : (
          <div className="auth-switch">
            <span>
              {isLogin ? "New here?" : "Already have an account?"}
            </span>

            <button type="button" onClick={switchMode}>
              {isLogin ? "Create an account" : "Log in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Auth;
