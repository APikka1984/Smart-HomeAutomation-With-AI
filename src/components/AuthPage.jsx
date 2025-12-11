import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-center mb-4">{isLogin ? "User Login" : "Create Account"}</h2>

        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full p-2 border rounded"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="w-full p-2 border rounded"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {busy ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm mt-4">
          {isLogin ? "New user?" : "Already have an account?"}{" "}
          <button className="text-blue-600 underline" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Create account" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}
