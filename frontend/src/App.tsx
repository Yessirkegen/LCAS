import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Cabin from "./pages/Cabin";
import Dispatch from "./pages/Dispatch";
import Replay from "./pages/Replay";
import Admin from "./pages/Admin";
import Simulator from "./pages/Simulator";
import Dashboard from "./pages/Dashboard";
import CommandPalette from "./components/CommandPalette";
import AppLayout from "./components/AppLayout";

const ROLE_ALLOWED: Record<string, string[]> = {
  driver: ["/cabin"],
  dispatcher: ["/cabin", "/dispatch"],
  admin: ["/cabin", "/dispatch", "/admin", "/simulator", "/dashboard"],
  simulator: ["/cabin", "/dispatch", "/simulator", "/dashboard"],
};

const ROLE_DEFAULT: Record<string, string> = {
  driver: "/cabin",
  dispatcher: "/dispatch",
  admin: "/admin",
  simulator: "/simulator",
};

function isAllowed(role: string, path: string): boolean {
  const allowed = ROLE_ALLOWED[role] || ROLE_ALLOWED.driver;
  return allowed.some((p) => path.startsWith(p));
}

function AppRoutes() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const location = useLocation();
  const role = localStorage.getItem("role") || "driver";
  const token = localStorage.getItem("token");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const defaultPath = ROLE_DEFAULT[role] || "/cabin";

  if (!isAllowed(role, location.pathname)) {
    return <Navigate to={defaultPath} replace />;
  }

  return (
    <AppLayout>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} locomotives={[]} />
      <Routes>
        <Route path="/cabin" element={<Cabin />} />

        {(role === "dispatcher" || role === "admin" || role === "simulator") && (
          <>
            <Route path="/dispatch" element={<Dispatch />} />
            <Route path="/dispatch/loco/:id" element={<Dispatch />} />
            <Route path="/dispatch/loco/:id/replay" element={<Replay />} />
          </>
        )}

        {(role === "admin" || role === "simulator") && (
          <>
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </>
        )}

        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </AppLayout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<AppRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
