import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase-admin";

const preferenceKeys = [
  "fajr",
  "zuhar",
  "asr",
  "magrib",
  "isha",
  "jumah",
] as const;

type PrayerPreference = (typeof preferenceKeys)[number];

export async function GET(request: Request) {
  try {
    const endpoint = new URL(request.url).searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json(
        { error: "Missing subscription endpoint" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select(
        "reminder_minutes, fajr, zuhar, asr, magrib, isha, jumah"
      )
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (error) {
      console.error("Failed to load preferences:", error);
      return NextResponse.json(
        { error: "Failed to load preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferences: data ?? {
        reminder_minutes: 5,
        fajr: true,
        zuhar: true,
        asr: true,
        magrib: true,
        isha: true,
        jumah: true,
      },
    });
  } catch (error) {
    console.error("Preferences GET error:", error);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const endpoint = body.endpoint;
    const reminderMinutes = Number(body.reminder_minutes);
    const preferences = body.preferences;

    if (!endpoint || !preferences) {
      return NextResponse.json(
        { error: "Missing endpoint or preferences" },
        { status: 400 }
      );
    }

    if (![5, 10, 15, 30].includes(reminderMinutes)) {
      return NextResponse.json(
        { error: "Invalid reminder time" },
        { status: 400 }
      );
    }

    const updates: Record<string, string | number | boolean> = {
      reminder_minutes: reminderMinutes,
      updated_at: new Date().toISOString(),
    };

    for (const key of preferenceKeys) {
      if (typeof preferences[key] !== "boolean") {
        return NextResponse.json(
          { error: `Invalid preference: ${key}` },
          { status: 400 }
        );
      }

      updates[key as PrayerPreference] = preferences[key];
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("push_subscriptions")
      .update(updates)
      .eq("endpoint", endpoint)
      .select("endpoint")
      .maybeSingle();

    if (error) {
      console.error("Failed to update preferences:", error);
      return NextResponse.json(
        { error: "Failed to save preferences" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Subscription not found. Enable notifications first." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notification preferences saved",
    });
  } catch (error) {
    console.error("Preferences PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
