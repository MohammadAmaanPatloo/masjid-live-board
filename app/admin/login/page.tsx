"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "../../../lib/supabase-browser";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Invalid admin email or password.");
      setLoading(false);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <main className="admin-auth-page">
      <div className="admin-login-card">
        <div className="admin-shield"><ShieldCheck size={34} /></div>
        <p className="admin-kicker">MASJID LIVE BOARD</p>
        <h1>Admin Login</h1>
        <p className="admin-muted">Only the authorized mosque administrator can change the board.</p>

        <form onSubmit={handleLogin} className="admin-form">
          <label>
            Admin Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" autoComplete="email" required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
          </label>
          {error && <div className="admin-error">{error}</div>}
          <button className="admin-primary-button" type="submit" disabled={loading}>
            <LockKeyhole size={18} />
            {loading ? "Signing in..." : "Sign in securely"}
          </button>
        </form>

        <a className="back-board-link" href="/">← View public board</a>
      </div>
    </main>
  );
}
