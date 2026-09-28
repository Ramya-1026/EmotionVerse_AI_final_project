import { useState } from "react";
import "./App.css";

function Auth({ onLoggedIn }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  const switchMode = () => {
    setMode(isLogin ? "register" : "login");
    setError("");
    setInfo("");
  };

  const validate = () => {
    const name = username.trim();

    if (!name || !password) {
      return "Please enter username and password.";
    }

    if (name.length < 3) {
      return "Username must be at least 3 characters.";
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
      const res = await fetch(
        isLogin ? "/api/login" : "/api/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password: password,
          }),
        }
      );

      const data = await res.json();

      if (!isLogin) {
        // Register: switch to login on success
        if (data.success) {
          setInfo("Account created! Please log in.");
          setMode("login");
          setPassword("");
        } else {
          setError(data.message || "Registration failed.");
        }
        return;
      }

      // Login
      if (data.success && data.token) {
        localStorage.setItem("ev_token", data.token);
        localStorage.setItem("ev_user", data.username || username.trim().toLowerCase());
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
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>

        <p className="auth-subtitle">
          {isLogin
            ? "Log in to continue your emotional universe"
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

          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
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
              : isLogin
              ? "Log In"
              : "Create Account"}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {isLogin
              ? "New here?"
              : "Already have an account?"}
          </span>

          <button type="button" onClick={switchMode}>
            {isLogin ? "Create an account" : "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Auth;
