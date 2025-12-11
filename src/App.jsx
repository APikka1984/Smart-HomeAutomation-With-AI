import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import AuthPage from "./components/AuthPage";  // ⬅ Corrected
import ProtectedRoute from "./components/ProtectedRoute"; // ⬅ Will create this now

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirect all pages to Auth */}
        <Route path="*" element={<AuthPage />} />
      </Routes>
    </BrowserRouter>
  );
}
