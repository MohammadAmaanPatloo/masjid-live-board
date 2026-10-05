"use client";

import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase-browser";

const boardData = {
  masjidName: "MASJID LIVE BOARD",

  hijriDay: "25",
  hijriMonth: "3",
  hijriYear: "1448",

  adhanStart: "12:28",
  adhanEnd: "5:02",

  currentPrayer: "ZUHR",

  temperature: "27°C",

  tauluTime: "6:09",
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
  zuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  jumuah: string;
  sahr: string;
  iftar: string;
  tomorrow: string;
};

const defaultPrayerData: PrayerData = {
  fajr: "5:15",
  zuhr: "1:15",
  asr: "5:20",
  maghrib: "6:56",
  isha: "8:30",
  jumuah: "1:15",
  sahr: "4:45",
  iftar: "6:51",
  tomorrow: "1:15",
};

export default function Home() {
  const [now, setNow] = useState(new Date());
  const [prayerData, setPrayerData] =
    useState<PrayerData>(defaultPrayerData);

  /*
   * --------------------------------------------------
   * LIVE CLOCK
   * --------------------------------------------------
   */

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
    .toLocaleDateString("en-US", {
      month: "long",
    })
    .toUpperCase();

  const day = now
    .toLocaleDateString("en-US", {
      weekday: "short",
    })
    .toUpperCase();

  const gregorianDay = pad(now.getDate());
  const gregorianMonth = pad(now.getMonth() + 1);
  const gregorianYear = now.getFullYear();

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
      name: "ZUHR",
      arabic: "ظہر",
      time: prayerData.zuhr,
      color: "green",
    },
    {
      name: "ASR",
      arabic: "عصر",
      time: prayerData.asr,
      color: "green",
    },
    {
      name: "MAGHRIB",
      arabic: "مغرب",
      time: prayerData.maghrib,
      color: "green",
    },
    {
      name: "ISHA'",
      arabic: "عشاء",
      time: prayerData.isha,
      color: "green",
    },
    {
      name: "JUM'AH",
      arabic: "جمعۃ",
      time: prayerData.jumuah,
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
          <div className="round-logo">مُحَمَّد</div>

          <div className="arabic-title">
            لَا إِلَٰهَ إِلَّا ٱللَّٰهُ مُحَمَّدٌ رَسُولُ ٱللَّٰهِ
          </div>

          <div className="round-logo">ﷲ</div>
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
              <span>اذان START</span>
              <span>END</span>
            </div>

            <div className="current-prayer">
              {boardData.currentPrayer}
            </div>

            <div className="weather">
              🌡 <strong>{boardData.temperature}</strong>
            </div>

            <div className="mini-row">
              <span>TAULU' start</span>
              <strong>{boardData.tauluTime}</strong>
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
                {formatTime(now)}
              </span>
            </div>

            <div className="central-calligraphy">
              ﷽
            </div>

            <div className="masjid-name">
              {boardData.masjidName}
            </div>

            <div className="tagline">
              Prayer &amp; Jama'at timings
            </div>

            <div className="current-box">

              <div className="current-label">
                {boardData.currentPrayer}
              </div>

              <div className="current-time">
                {prayerData.zuhr}
              </div>

              <div className="jamaat-label">
                JAMA'AT
              </div>

              <div className="azan-line">
                <span>🔊 AZAN</span>

                <strong>
                  {prayerData.zuhr}
                </strong>
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
              <span>اگلے دن</span>
            </div>

          </aside>

        </div>

        {/* FOOTER */}

        <footer className="board-footer">

          <span>
            🕌 AL REHMAN MASJID PRAYER &amp; JAMA'AT INFORMATION
          </span>

          <a
            href="/admin"
            className="admin-entry-link"
          >
            ADMIN
          </a>

          <span>LIVE</span>

        </footer>

      </section>

      <div className="mobile-note">
        <strong>Masjid Live Board</strong>

        <span>
          Powered by MAPOS.
        </span>
      </div>

    </main>
  );
}