"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase-browser";

const boardData = {
  masjidName: "AL REHMAN MASJID",

  hijriDay: "25",
  hijriMonth: "3",
  hijriYear: "1448",

  adhanStart: "12:28",
  adhanEnd: "5:02",

  currentPrayer: "ZUHAR",

  temperature: "27°C",

  tuluTime: "6:09",
  zawalTime: "12:28",
  gurubTime: "6:50",
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatTime(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const h = hours % 12 || 12;

  return `${h}:${pad(minutes)}`;
}

type PrayerData = {
  fajr: string;
  zuhar: string;
  asr: string;
  magrib: string;
  isha: string;
  jumah: string;
  sahr: string;
  iftar: string;
  tomorrow: string;
};

const defaultPrayerData: PrayerData = {
  fajr: "5:15",
  zuhar: "1:15",
  asr: "5:20",
  magrib: "6:56",
  isha: "8:30",
  jumah: "1:15",
  sahr: "4:45",
  iftar: "6:51",
  tomorrow: "1:15",
};

export default function Home() {
  const [now, setNow] = useState<Date | null>(null);
  const [showNotificationSettings, setShowNotificationSettings] =
    useState(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  const [reminderMinutes, setReminderMinutes] = useState("5");
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  const [selectedPrayers, setSelectedPrayers] = useState({
    fajr: true,
    zuhar: true,
    asr: true,
    magrib: true,
    isha: true,
    jumah: true,
  });
  const [prayerData, setPrayerData] =
    useState<PrayerData>(defaultPrayerData);

/* --------------------------------------------------
 * LIVE CLOCK
 * -------------------------------------------------- */

useEffect(() => {
  setNow(new Date());

  const timer = setInterval(() => {
    setNow(new Date());
  }, 1000);

  return () => clearInterval(timer);
}, []);

/* --------------------------------------------------
 * CHECK NOTIFICATION PERMISSION
 * -------------------------------------------------- */

useEffect(() => {
  async function checkPushSubscription() {
    if (!("Notification" in window)) {
      return;
    }

    const permission = Notification.permission;

    setNotificationPermission(permission);

    // Permission alone does NOT mean Web Push is enabled.
    if (permission !== "granted") {
      setNotificationsEnabled(false);
      return;
    }

    if (!("serviceWorker" in navigator)) {
      setNotificationsEnabled(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      const subscription =
        await registration.pushManager.getSubscription();

      if (subscription) {
        console.log(
          "Existing push subscription found:",
          subscription.endpoint
        );

        setNotificationsEnabled(true);
      } else {
        console.log("No push subscription found.");

        setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error(
        "Failed to check push subscription:",
        error
      );

      setNotificationsEnabled(false);
    }
  }

  checkPushSubscription();
}, []);


useEffect(() => {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers are not supported.");
    return;
  }

  navigator.serviceWorker
    .register("/sw.js")
    .then((registration) => {
      console.log(
        "Service Worker registered:",
        registration.scope
      );
    })
    .catch((error) => {
      console.error(
        "Service Worker registration failed:",
        error
      );
    });
}, []);

// Load saved notification preferences
useEffect(() => {
  void loadPreferences();
}, []);

/* --------------------------------------------------
 * NOTIFICATION SETTINGS
 * -------------------------------------------------- */

async function savePreferences(
  minutes = reminderMinutes,
  prayers = selectedPrayers
) {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) return;

  setPreferencesSaving(true);

  try {
    const response = await fetch("/api/push/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        reminder_minutes: Number(minutes),
        preferences: prayers,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not save preferences");
    }
  } catch (error) {
    console.error("Save preferences error:", error);
    alert(
      error instanceof Error
        ? error.message
        : "Could not save notification preferences"
    );
  } finally {
    setPreferencesSaving(false);
  }
}

async function loadPreferences() {
  try {
    if (!("serviceWorker" in navigator)) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) return;

    const response = await fetch(
      `/api/push/preferences?endpoint=${encodeURIComponent(
        subscription.endpoint
      )}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not load preferences");
    }

    if (result.preferences) {
      setReminderMinutes(
        String(result.preferences.reminder_minutes ?? 5)
      );

      setSelectedPrayers({
        fajr: result.preferences.fajr ?? true,
        zuhar: result.preferences.zuhar ?? true,
        asr: result.preferences.asr ?? true,
        magrib: result.preferences.magrib ?? true,
        isha: result.preferences.isha ?? true,
        jumah: result.preferences.jumah ?? true,
      });
    }
  } catch (error) {
    console.error("Load preferences error:", error);
  } finally {
    setPreferencesLoaded(true);
  }
}

function togglePrayer(prayer: keyof typeof selectedPrayers) {
  setSelectedPrayers((current) => {
    const updated = {
      ...current,
      [prayer]: !current[prayer],
    };

    void savePreferences(reminderMinutes, updated);
    return updated;
  });
}


async function enableNotifications() {
  if (!("Notification" in window)) {
    alert(
      "This browser does not support notifications."
    );
    return;
  }

  if (!("serviceWorker" in navigator)) {
    alert(
      "This browser does not support background notifications."
    );
    return;
  }

  if (!("PushManager" in window)) {
    alert(
      "This browser does not support Web Push."
    );
    return;
  }

  try {
    const permission =
      await Notification.requestPermission();

    setNotificationPermission(permission);

    if (permission !== "granted") {
      setNotificationsEnabled(false);

      if (permission === "denied") {
        alert(
          "Notifications are blocked. Please enable them in your browser settings."
        );
      }

      return;
    }

    /*
     * Get the registered Service Worker.
     */
    const registration =
      await navigator.serviceWorker.ready;

    /*
     * Get the VAPID public key.
     */
    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      throw new Error(
        "NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing."
      );
    }
    /*
     * Convert VAPID key to Uint8Array.
     */
    function urlBase64ToUint8Array(
      base64String: string
    ) {
      const padding =
        "=".repeat(
          (4 - (base64String.length % 4)) % 4
        );

      const base64 =
        (
          base64String +
          padding
        )
          .replace(/-/g, "+")
          .replace(/_/g, "/");

      const rawData =
        window.atob(base64);

      return Uint8Array.from(
        [...rawData].map(
          (char) => char.charCodeAt(0)
        )
      );
    }

    /*
     * Create or retrieve push subscription.
     */
    let subscription =
      await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription =
        await registration.pushManager.subscribe({
          userVisibleOnly: true,

          applicationServerKey:
            urlBase64ToUint8Array(
              vapidPublicKey
            ),
        });
    }

    console.log("Push subscription created:", {
  endpoint: subscription.endpoint,
  keys: subscription.toJSON().keys,
});
    /*
     * Send subscription to our Next.js server.
     */
    const response = await fetch(
      "/api/push/subscribe",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          subscription.toJSON()
        ),
      }
    );

    const result = await response.json();
console.log("Push subscription API response:", {
  status: response.status,
  ok: response.ok,
  result,
});
    if (!response.ok) {
      throw new Error(
        result.error ||
          "Failed to save push subscription."
      );
    }

    setNotificationsEnabled(true);

    new Notification(
      "🔔 Al Rehman Masjid",
      {
        body:
          "Background prayer notifications have been enabled successfully.",
      }
    );

    setShowNotificationSettings(true);
  } catch (error) {
    console.error(
      "Web Push setup error:",
      error
    );

    alert(
      error instanceof Error
        ? error.message
        : "Failed to enable notifications."
    );
  }
}


  /*
   * --------------------------------------------------
   * LOAD PRAYER TIMES + SUPABASE REALTIME
   * --------------------------------------------------
   */

  useEffect(() => {
    const supabase = createClient();

    async function loadPrayerBoard() {
      const { data, error } = await supabase
        .from("prayer_board")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) {
        console.error(
          "Failed to load prayer board:",
          error
        );
        return;
      }

      setPrayerData({
        fajr: data.fajr,
        zuhar: data.zuhar,
        asr: data.asr,
        magrib: data.magrib,
        isha: data.isha,
        jumah: data.jumah,
        sahr: data.sahr,
        iftar: data.iftar,
        tomorrow: data.tomorrow,
      });
    }

    // Load current values when the page opens
    loadPrayerBoard();

    /*
     * Listen for changes made by the Admin Panel.
     */
    const channel = supabase
      .channel("prayer-board-live")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "prayer_board",
          filter: "id=eq.1",
        },
        (payload) => {
          const data = payload.new as PrayerData;

          setPrayerData({
            fajr: data.fajr,
            zuhar: data.zuhar,
            asr: data.asr,
            magrib: data.magrib,
            isha: data.isha,
            jumah: data.jumah,
            sahr: data.sahr,
            iftar: data.iftar,
            tomorrow: data.tomorrow,
          });
        }
      )
      .subscribe((status) => {
        console.log(
          "Prayer board realtime status:",
          status
        );
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /*
   * --------------------------------------------------
   * DATE / CLOCK
   * --------------------------------------------------
   */
const month = now
  ? now
      .toLocaleDateString("en-US", {
        month: "long",
      })
      .toUpperCase()
  : "";

const day = now
  ? now
      .toLocaleDateString("en-US", {
        weekday: "short",
      })
      .toUpperCase()
  : "";

const gregorianDay = now
  ? pad(now.getDate())
  : "--";

const gregorianMonth = now
  ? pad(now.getMonth() + 1)
  : "--";

const gregorianYear = now
  ? now.getFullYear()
  : "----";
  /*
   * --------------------------------------------------
   * PRAYER LIST
   * --------------------------------------------------
   */

  const prayers = [
    {
      name: "FAJR",
      arabic: "فجر",
      time: prayerData.fajr,
      color: "green",
    },
    {
      name: "ZUHAR",
      arabic: "ظہر",
      time: prayerData.zuhar,
      color: "green",
    },
    {
      name: "ASR",
      arabic: "عصر",
      time: prayerData.asr,
      color: "green",
    },
    {
      name: "MAGRIB",
      arabic: "مغرب",
      time: prayerData.magrib,
      color: "green",
    },
    {
      name: "ISHA",
      arabic: "عشاء",
      time: prayerData.isha,
      color: "green",
    },
    {
      name: "JUM'AH",
      arabic: "جمعہ",
      time: prayerData.jumah,
      color: "green",
    },
  ];

  return (
    <main className="page-shell">
      <section
        className="board"
        aria-label="Masjid prayer board"
      >
        {/* HEADER */}

        <header className="board-header">
          <div className="round-logo arabic-muhammad">مُحَمَّد</div>

          <div className="arabic-title">
            لَا إِلَٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ
          </div>

          <div className="round-logo arabic-allah">ﷲ</div>
        </header>

        <div className="board-main">

          {/* LEFT PANEL */}

          <aside className="left-panel">

            <div className="month-display">
              {month}
            </div>

            <div className="date-display">
              {boardData.hijriDay}
              &nbsp;&nbsp;
              {boardData.hijriMonth}
              &nbsp;&nbsp;
              {boardData.hijriYear}
            </div>

            <div className="date-display small">
              {gregorianDay}
              &nbsp;&nbsp;
              {gregorianMonth}
              &nbsp;&nbsp;
              {gregorianYear}
            </div>

            <div className="sun-row">
              <span>{boardData.adhanStart}</span>
              <span>{boardData.adhanEnd}</span>
            </div>

            <div className="sun-labels">
              <span>START</span>
              <span>END</span>
            </div>

            <div className="current-prayer">
              {boardData.currentPrayer}
            </div>

            <div className="weather">
              🌡 <strong>{boardData.temperature}</strong>
            </div>

            <div className="mini-row">
              <span>TULU start</span>
              <strong>{boardData.tuluTime}</strong>
              <span>طلوع</span>
            </div>

            <div className="mini-row">
              <span>ZAWAL</span>
              <strong>{boardData.zawalTime}</strong>
              <span>زوال</span>
            </div>

            <div className="mini-row">
              <span>GURUB</span>
              <strong>{boardData.gurubTime}</strong>
              <span>غروب</span>
            </div>

          </aside>

          {/* CENTER PANEL */}

          <section className="center-panel">

            <div className="top-clock">
              <span className="weekday">
                {day}
              </span>

              <span className="live-time">
  {now ? formatTime(now) : "--:--"}
</span>
            </div>

            <div className="central-calligraphy">
              ﷽
            </div>

            <div className="masjid-name">
              {boardData.masjidName}
            </div>

            
<div className="tagline">
  Prayer &amp; Jama'at Information
</div>

<div className="prayer-verse">
  <p className="verse-english">
    Verily, As-Salaat (prayer) is enjoined on the believers at fixed hours.
  </p>
  <p className="verse-urdu" lang="ur" dir="rtl">
    بے شک نماز مومنوں پر مقررہ اوقات میں فرض کی گئی ہے۔
  </p>
</div>




      <div className="current-box">
        {/* Row 1: Zuhar + large time */}
        <div className="current-prayer-row">
          <div className="current-label">
            {boardData.currentPrayer}
          </div>

          <div className="current-time">
            {prayerData.zuhar}
          </div>
        </div>

        {/* Row 2: Jama'at + Urdu */}
        <div className="jamaat-row">
          <span className="jamaat-english">
            JAMA'AT
          </span>

          <span className="jamaat-urdu" lang="ur" dir="rtl">
            جماعت
          </span>
        </div>

        {/* Row 3: Azan + time + Urdu */}
        <div className="azan-row">
          <span className="azan-english">
            <span className="azan-icon">🔊</span>
            AZAN
          </span>

          <strong className="azan-time">
            {prayerData.zuhar}
          </strong>

          <span className="azan-urdu" lang="ur" dir="rtl">
            اذان
          </span>
        </div>
      </div>



          </section>
          {/* RIGHT PANEL */}

          <aside className="right-panel">

            {prayers.map((prayer) => (
              <div
                className="prayer-row"
                key={prayer.name}
              >
                <span className="prayer-name">
                  {prayer.name}
                </span>

                <span
                  className={`led-time ${prayer.color}`}
                >
                  {prayer.time}
                </span>

                <span className="prayer-arabic">
                  {prayer.arabic}
                </span>
              </div>
            ))}

            <div className="special-row">
              <span>SAHR</span>
              <strong>{prayerData.sahr}</strong>
              <span>سحر</span>
            </div>

            <div className="special-row">
              <span>IFTAR</span>
              <strong>{prayerData.iftar}</strong>
              <span>افطار</span>
            </div>

            <div className="special-row">
              <span>TOMORROW</span>
              <strong>{prayerData.tomorrow}</strong>
              <span>کل</span>
            </div>

          </aside>

        </div>

        {/* FOOTER */}

        <footer className="board-footer">
          <span>🕌 AL REHMAN MASJID - SIR SYED COLONY - UPPER SOURA - SRINAGAR</span>

          <button
            className="notification-button"
            onClick={() =>
              setShowNotificationSettings((current) => !current)
            }
          >
            🔔 Notifications
          </button>

          <a href="/admin" className="admin-entry-link">
            ADMIN
          </a>

          
        </footer>

      </section>
      {showNotificationSettings && (
  <section className="notification-settings">
    <div className="notification-header">
      <div>
        <h2>🔔 Prayer Notifications</h2>
        <p>
          Get reminders before prayer and Jama'at timings.
        </p>
      </div>

      <button
        className="notification-close"
        onClick={() => setShowNotificationSettings(false)}
        aria-label="Close notification settings"
      >
        ✕
      </button>
    </div>

    <div className="notification-enable">
      <div>
        <strong>
          {notificationsEnabled
            ? "Notifications Enabled"
            : "Get Prayer Reminders"}
        </strong>

<span>
  {notificationsEnabled
    ? "You will receive prayer reminders on this device."
    : notificationPermission === "denied"
      ? "Notifications are blocked. Please enable them in browser settings."
      : "Receive reminders before prayers and Jama'at."}
</span>
      </div>


<button
  className="notification-enable-button"
  onClick={enableNotifications}
  disabled={notificationsEnabled}
>
  {notificationsEnabled
    ? "✓ Notifications Enabled"
    : notificationPermission === "denied"
      ? "Notifications Blocked"
      : "Enable Notifications"}
</button>
    </div>

    <div className="notification-options">
      <div className="notification-option-group">
        <h3>Reminder time</h3>


<select
  value={reminderMinutes}
  onChange={(e) => {
    const value = e.target.value;
    setReminderMinutes(value);
    void savePreferences(value, selectedPrayers);
  }}
>
  <option value="5">5 minutes before</option>
  <option value="10">10 minutes before</option>
  <option value="15">15 minutes before</option>
  <option value="30">30 minutes before</option>
</select>

{preferencesSaving && (
  <small>Saving notification preferences…</small>
)}

      </div>

      <div className="notification-option-group">
        <h3>Prayers</h3>

        <div className="prayer-checkboxes">

          <label>
            <input
              type="checkbox"
              checked={selectedPrayers.fajr}
              onChange={() => togglePrayer("fajr")}
            />
            Fajr
          </label>

          <label>
            <input
              type="checkbox"
              checked={selectedPrayers.zuhar}
              onChange={() => togglePrayer("zuhar")}
            />
            Zuhar
          </label>

          <label>
            <input
              type="checkbox"
              checked={selectedPrayers.asr}
              onChange={() => togglePrayer("asr")}
            />
            Asr
          </label>

          <label>
            <input
              type="checkbox"
              checked={selectedPrayers.magrib}
              onChange={() => togglePrayer("magrib")}
            />
            Magrib
          </label>

          <label>
            <input
              type="checkbox"
              checked={selectedPrayers.isha}
              onChange={() => togglePrayer("isha")}
            />
            Isha
          </label>

          <label>
            <input
              type="checkbox"
              checked={selectedPrayers.jumah}
              onChange={() => togglePrayer("jumah")}
            />
            Jumah
          </label>

        </div>
      </div>
    </div>

    <div className="notification-preview">
      <span>Preview</span>

      <strong>
        🔔 Zuhar Prayer Soon
      </strong>

      <p>
        Zuhar prayer starts at {prayerData.zuhar}.
        Jama'at timing will be added in the next step.
      </p>
    </div>
  </section>
)}

      <div className="mobile-note">
        <strong>Powered by MAPOS</strong>

        <span>
          8494001112
        </span>
      </div>

    </main>
  );
}