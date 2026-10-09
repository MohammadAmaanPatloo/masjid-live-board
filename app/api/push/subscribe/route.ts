import { NextResponse } from "next/server";
import { createAdminClient } from "../../../../lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const subscription = body.subscription ?? body;

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json(
        { error: "Invalid push subscription" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("Failed to save push subscription:", error);

      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Push subscription saved",
    });
  } catch (error) {
    console.error("Push subscription error:", error);

    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
