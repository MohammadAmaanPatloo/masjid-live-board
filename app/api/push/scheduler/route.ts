import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";

function parseTime(timeValue: string) {
  if (!timeValue) return null;

  const value = timeValue.trim().toUpperCase();

  // 24-hour format: 13:15
  const twentyFourHour = value.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHour) {
    return {
      hour: Number(twentyFourHour[1]),
      minute: Number(twentyFourHour[2]),
    };
  }

  // 12-hour format: 1:15 PM
  const twelveHour = value.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/
  );

  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2]);
    const period = twelveHour[3];

    if (period === "PM" && hour !== 12) {
      hour += 12;
    }

    if (period === "AM" && hour === 12) {
      hour = 0;
    }

    return {
      hour,
      minute,
    };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    // Protect this endpoint.
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const authorization = request.headers.get("authorization");

      if (authorization !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    if (
      !process.env.VAPID_SUBJECT ||
      !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      !process.env.VAPID_PRIVATE_KEY
    ) {
      return NextResponse.json(
        { error: "VAPID configuration missing" },
        { status: 500 }
      );
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const supabase = createAdminClient();

    /*
     * India time.
     *
     * Your Masjid board is using India/Kolkata time.
     */
    const now = new Date();

    const indiaParts = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(now);

    const getPart = (type: string) =>
      indiaParts.find((part) => part.type === type)?.value || "";

    const year = Number(getPart("year"));
    const month = Number(getPart("month"));
    const day = Number(getPart("day"));
    const currentHour = Number(getPart("hour"));
    const currentMinute = Number(getPart("minute"));

    const today = `${year}-${String(month).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;

    /*
     * Get today's prayer board.
     */
const { data: prayerBoard, error: prayerBoardError } = await supabase
  .from("prayer_board")
  .select("fajr, zuhar, asr, magrib, isha, jumah")
  .eq("id", 1)
  .single();

    if (prayerBoardError || !prayerBoard) {
      console.error("Prayer board error:", prayerBoardError);

      return NextResponse.json(
        {
          error: "Prayer board not found",
          details: prayerBoardError?.message,
        },
        { status: 500 }
      );
    }

    /*
     * Get all active push subscriptions.
     */
    const { data: subscriptions, error: subscriptionError } =
      await supabase
        .from("push_subscriptions")
        .select(
          `
          id,
          endpoint,
          p256dh,
          auth,
          reminder_minutes,
          fajr,
          zuhar,
          asr,
          magrib,
          isha,
          jumah
        `
        );

    if (subscriptionError) {
      console.error(
        "Subscription query error:",
        subscriptionError
      );

      return NextResponse.json(
        { error: subscriptionError.message },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No push subscriptions found",
        sent: 0,
      });
    }
    

const indiaDay = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  weekday: "long",
}).format(now);

const isFriday = indiaDay === "Friday";

const prayers = [
  { key: "fajr", name: "Fajr" },
  { key: "zuhar", name: "Zuhar" },
  { key: "asr", name: "Asr" },
  { key: "magrib", name: "Magrib" },
  { key: "isha", name: "Isha" },
  { key: "jumah", name: "Jumah" },
] as const;


    let sentCount = 0;

    for (const subscription of subscriptions) {
      const reminderMinutes =
        subscription.reminder_minutes ?? 5;

      for (const prayer of prayers) {
        /*
         * Is this prayer enabled for this user?
         */

if (prayer.key === "jumah") {
  // Jumah reminders are only for Fridays.
  if (!isFriday) continue;

  // On Friday, Jumah replaces Zuhar.
} else {
  // Never send the Zuhar reminder on Friday.
  if (prayer.key === "zuhar" && isFriday) {
    continue;
  }
}

const enabled = subscription[prayer.key] === true;

if (!enabled) continue;

// Jumah uses the Zuhar prayer time.
const prayerTime =
  prayer.key === "jumah"
    ? prayerBoard.zuhar
    : prayerBoard[prayer.key];


        if (!prayerTime) {
          continue;
        }

        let timeToParse = String(prayerTime).trim();

// Fajr is AM; all other prayer times are PM.
if (prayer.key === "fajr") {
  timeToParse = `${timeToParse} AM`;
} else {
  timeToParse = `${timeToParse} PM`;
}

const parsed = parseTime(timeToParse);

        if (!parsed) {
          console.warn(
            `Invalid ${prayer.name} time:`,
            prayerTime
          );
          continue;
        }

        const prayerTotalMinutes =
          parsed.hour * 60 + parsed.minute;

        const reminderTotalMinutes =
          prayerTotalMinutes - reminderMinutes;

        const currentTotalMinutes =
          currentHour * 60 + currentMinute;

        /*
         * Send only during the exact reminder minute.
         */

const minutesUntilPrayer =
  prayerTotalMinutes - currentTotalMinutes;

// Send once the selected reminder time is reached,
// allowing a small delay from the minute-based cron.
if (
  minutesUntilPrayer > reminderMinutes ||
  minutesUntilPrayer < 0
) {
  continue;
}

        /*
         * Prevent duplicate notification.
         */
        const { data: existing } = await supabase
          .from("push_notification_log")
          .select("id")
          .eq("endpoint", subscription.endpoint)
          .eq("prayer_name", prayer.name)
          .eq("prayer_date", today)
          .eq("reminder_minutes", reminderMinutes)
          .maybeSingle();

        if (existing) {
          continue;
        }

        const payload = {
          title: `🔔 ${prayer.name} Prayer Soon`,
          body: `${prayer.name} prayer starts at ${prayerTime}.`,
          url: "/",
        };

        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            JSON.stringify(payload),
            {
              TTL: 3600,
              urgency: "high",
            }
          );

          await supabase
            .from("push_notification_log")
            .insert({
              endpoint: subscription.endpoint,
              prayer_name: prayer.name,
              prayer_date: today,
              reminder_minutes: reminderMinutes,
            });

          sentCount++;

          console.log(
            `Sent ${prayer.name} reminder to subscription ${subscription.id}`
          );
        } catch (pushError: any) {
          console.error(
            `Failed to send ${prayer.name} notification:`,
            pushError
          );

          /*
           * 404/410 normally means the browser subscription
           * is no longer valid.
           */
          if (
            pushError?.statusCode === 404 ||
            pushError?.statusCode === 410
          ) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", subscription.id);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      time: `${String(currentHour).padStart(
        2,
        "0"
      )}:${String(currentMinute).padStart(2, "0")}`,
      checkedSubscriptions: subscriptions.length,
      sent: sentCount,
    });
  } catch (error) {
    console.error("Prayer scheduler error:", error);

    return NextResponse.json(
      {
        error: "Scheduler failed",
      },
      { status: 500 }
    );
  }
}