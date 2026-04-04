import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Cabin from "./pages/Cabin";
import Dispatch from "./pages/Dispatch";
import Replay from "./pages/Replay";
import Admin from "./pages/Admin";
import Simulator from "./pages/Simulator";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cabin" element={<Cabin />} />
        <Route path="/dispatch" element={<Dispatch />} />
        <Route path="/dispatch/loco/:id" element={<Dispatch />} />
        <Route path="/dispatch/loco/:id/replay" element={<Replay />} />
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
