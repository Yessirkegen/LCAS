import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Неверный логин или пароль");
        return;
      }
      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username);
      const redirects: Record<string, string> = {
        driver: "/cabin",
        dispatcher: "/dispatch",
        admin: "/admin",
        simulator: "/simulator",
      };
      navigate(redirects[data.role] || "/cabin");
    } catch {
      setError("Ошибка подключения к серверу");
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleLogin}>
        <h1>⚡ Kinetic Cockpit</h1>
        <p className="login-subtitle">Интерфейс тепловоза v4.02</p>
        <div>
          <label style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--outline)", marginBottom: "0.375rem", display: "block" }}>
            Operator Identification
          </label>
          <input
            type="text"
            placeholder="ID_ОПЕРАТОРА"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--outline)", marginBottom: "0.375rem", display: "block" }}>
            Security Protocol Alpha
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">Войти в систему →</button>
        {error && <p className="login-error">{error}</p>}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "var(--outline)", marginTop: "0.5rem" }}>
          <span>Забыли пароль?</span>
          <span style={{ color: "var(--primary)" }}>● Телеметрия активна</span>
        </div>
      </form>

      <div className="login-footer">
        <strong>Стратегические активы КТЖ</strong><br />
        Данный терминал предназначен только для авторизованного персонала.
      </div>
    </div>
  );
}
