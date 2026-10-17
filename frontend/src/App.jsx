import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import TeamLayout from "./components/TeamLayout.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import TeamSecrets from "./pages/TeamSecrets.jsx";
import TeamMembers from "./pages/TeamMembers.jsx";
import TeamAudit from "./pages/TeamAudit.jsx";

export default function App() {
  const location = useLocation();

  return (
    <>
      <Navbar />
      <Routes location={location}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/teams/:teamId" element={<TeamLayout />}>
            <Route index element={<Navigate to="secrets" replace />} />
            <Route path="secrets" element={<TeamSecrets />} />
            <Route path="members" element={<TeamMembers />} />
            <Route path="audit" element={<TeamAudit />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}