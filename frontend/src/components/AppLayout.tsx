import { NavLink, useNavigate, useLocation } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTelemetryStore } from "../stores/telemetryStore";

const ROLE_NAV: Record<string, Array<{ path: string; label: string }>> = {
  driver: [
    { path: "/cabin", label: "Cabin" },
  ],
  dispatcher: [
    { path: "/cabin", label: "Cabin" },
    { path: "/dispatch", label: "Fleet" },
  ],
  admin: [
    { path: "/cabin", label: "Cabin" },
    { path: "/dispatch", label: "Fleet" },
    { path: "/simulator", label: "Simulator" },
    { path: "/admin", label: "Admin" },
    { path: "/dashboard", label: "System" },
  ],
  simulator: [
    { path: "/cabin", label: "Cabin" },
    { path: "/dispatch", label: "Fleet" },
    { path: "/simulator", label: "Simulator" },
    { path: "/admin", label: "Admin" },
    { path: "/dashboard", label: "System" },
  ],
};

const ROLE_SIDEBAR: Record<string, Array<{ path: string; label: string; icon: string }>> = {
  driver: [
    { path: "/cabin", label: "Dashboard", icon: "📊" },
  ],
  dispatcher: [
    { path: "/cabin", label: "Dashboard", icon: "📊" },
    { path: "/dispatch", label: "Fleet Overview", icon: "🚂" },
    { path: "/dispatch/loco/TE33A-0142/replay", label: "Replay", icon: "⏪" },
  ],
  admin: [
    { path: "/cabin", label: "Dashboard", icon: "📊" },
    { path: "/admin", label: "Diagnostics", icon: "🔧" },
    { path: "/dispatch", label: "Fleet Overview", icon: "🚂" },
    { path: "/dispatch/loco/TE33A-0142/replay", label: "Replay", icon: "⏪" },
    { path: "/simulator", label: "Simulation", icon: "⚡" },
    { path: "/dashboard", label: "System Health", icon: "📋" },
  ],
  simulator: [
    { path: "/cabin", label: "Dashboard", icon: "📊" },
    { path: "/simulator", label: "Simulation", icon: "⚡" },
    { path: "/dispatch", label: "Fleet Overview", icon: "🚂" },
    { path: "/dashboard", label: "System Health", icon: "📋" },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  driver: "Машинист",
  dispatcher: "Диспетчер",
  admin: "Администратор",
  simulator: "Симулятор",
};

interface Props {
  children: React.ReactNode;
}

export default function AppLayout({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem("username") || "operator";
  const role = localStorage.getItem("role") || "driver";

  const navItems = ROLE_NAV[role] || ROLE_NAV.driver;
  const sidebarItems = ROLE_SIDEBAR[role] || ROLE_SIDEBAR.driver;
  const alerts = useTelemetryStore((s) => s.alerts);
  const hasWarning = alerts.some((a) => a.level === "WARNING" && a.status === "active");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <nav className="top-nav">
        <span className="brand">Kinetic Cockpit</span>
        <div className="nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
        <div className="nav-spacer" />
        {(role === "admin" || role === "simulator") && (
          <input className="nav-search" placeholder="Search..." />
        )}
        {hasWarning ? (
          <button className="master-warning-btn active" id="master-warning-nav">
            ⚠ Master Warning
          </button>
        ) : (
          <div style={{ padding: "0.4rem 1rem", borderRadius: "var(--radius)", border: "1px solid var(--outline-variant)", color: "var(--outline)", fontFamily: "var(--font-display)", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Systems Normal
          </div>
        )}
        <div className="nav-icons">
          {(role === "admin") && <span className="nav-icon" title="Settings">⚙</span>}
          <span className="nav-icon" title="Notifications">🔔</span>
          <span className="nav-icon" title="Theme" onClick={() => document.documentElement.classList.toggle("light-theme")}>🌙</span>
          <LanguageSwitcher />
          <span className="nav-icon" title={`${username} (${ROLE_LABELS[role] || role})`} style={{ fontSize: "0.7rem", color: "var(--primary)" }}>
            {username}
          </span>
        </div>
      </nav>

      <aside className="sidebar">
        <div className="sidebar-unit">
          <div className="sidebar-unit-id">{username}</div>
          <div className="sidebar-unit-status">{ROLE_LABELS[role] || role}</div>
        </div>

        {sidebarItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

        <div className="sidebar-spacer" />

        {(role === "dispatcher" || role === "admin") && (
          <button className="sidebar-export" onClick={() => window.open("http://localhost:8000/api/reports/export/TE33A-0142?minutes=15&format=csv", "_blank")}>
            Export Telemetry
          </button>
        )}

        <button className="sidebar-footer-link" onClick={handleLogout}>
          <span>🚪</span> Sign Out
        </button>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
