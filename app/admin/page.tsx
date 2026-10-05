"use client";

import { useEffect, useState } from "react";
import { LogOut, Save, ShieldCheck } from "lucide-react";
import { createClient } from "../../lib/supabase-browser";

const fields = [
  ["fajr", "Fajr", "5:15"],
  ["zuhr", "Zuhr", "1:15"],
  ["asr", "Asr", "5:20"],
  ["maghrib", "Maghrib", "6:56"],
  ["isha", "Isha'", "8:30"],
  ["jumuah", "Jumu'ah", "1:15"],
  ["sahr", "Sahr", "4:45"],
  ["iftar", "Iftar", "6:51"],
  ["tomorrow", "Tomorrow", "1:15"]
] as const;

type Values = Record<(typeof fields)[number][0], string>;
const initialValues = Object.fromEntries(fields.map(([key, , value]) => [key, value])) as Values;

export default function AdminPage() {
  const [values, setValues] = useState<Values>(initialValues);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

useEffect(() => {
  const supabase = createClient();

  supabase.auth
    .getUser()
    .then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });

  loadPrayerTimes();
}, []);

    async function loadPrayerTimes() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("prayer_board")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) {
        console.error("Failed to load prayer times:", error);
        setMessage(`Error loading prayer times: ${error.message}`);
        return;
      }

      setValues({
        fajr: data.fajr,
        zuhr: data.zuhr,
        asr: data.asr,
        maghrib: data.maghrib,
        isha: data.isha,
        jumuah: data.jumuah,
        sahr: data.sahr,
        iftar: data.iftar,
        tomorrow: data.tomorrow,
      });
    }

  function updateValue(key: keyof Values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage("");
  }

  async function saveChanges() {
    setMessage("Saving...");

    const supabase = createClient();

    const { error } = await supabase
      .from("prayer_board")
      .update({
        fajr: values.fajr,
        zuhr: values.zuhr,
        asr: values.asr,
        maghrib: values.maghrib,
        isha: values.isha,
        jumuah: values.jumuah,
        sahr: values.sahr,
        iftar: values.iftar,
        tomorrow: values.tomorrow,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      console.error(error);
      setMessage(`Error: ${error.message}`);
      return;
    }

    setMessage("✓ Prayer times updated successfully.");
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <div><p className="admin-kicker">MASJID LIVE BOARD</p><h1>Admin Dashboard</h1></div>
        <div className="admin-top-actions">
          <span className="admin-user"><ShieldCheck size={16} /> {email}</span>
          <button className="admin-secondary-button" onClick={logout}><LogOut size={16} /> Logout</button>
        </div>
      </header>

      <section className="admin-content">
        <div className="admin-security-banner">
          <ShieldCheck size={22} />
          <div><strong>Secure admin area</strong><span>Your session is protected by Supabase Authentication. The public board cannot edit these settings.</span></div>
        </div>

        <div className="admin-grid">
          <section className="admin-card">
            <div className="admin-card-heading">
              <h2>Prayer &amp; Jama'at Times</h2>
              <p>Step 2 controls are ready. In Step 3 these values will be saved to Supabase.</p>
            </div>
            <div className="admin-fields">
              {fields.map(([key, label]) => (
                <label className="admin-field" key={key}>
                  <span>{label}</span>
                  <input value={values[key]} onChange={(e) => updateValue(key, e.target.value)} inputMode="numeric" placeholder="1:15" />
                </label>
              ))}
            </div>
            <button className="admin-primary-button save-button" onClick={saveChanges}><Save size={18} /> Save Changes</button>
            {message && <p className="admin-success">{message}</p>}
          </section>

          <aside className="admin-card admin-preview-card">
            <h2>Next: Live Board</h2>
            <p>After Step 3, changing a time here will update the public board automatically.</p>
            <div className="admin-preview-list">
              {fields.slice(0, 6).map(([key, label]) => <div key={key}><span>{label}</span><strong>{values[key]}</strong></div>)}
            </div>
            <a className="admin-preview-link" href="/">Open public board →</a>
          </aside>
        </div>
      </section>
    </main>
  );
}
