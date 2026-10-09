import { NextResponse } from "next/server";
import webpush from "../../../../lib/web-push";
import { createAdminClient } from "../../../../lib/supabase-admin";

export async function POST() {
  try {
    const supabase = createAdminClient();

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth");

    if (error) {
      console.error(
        "Failed to fetch push subscriptions:",
        error
      );

      return NextResponse.json(
        {
          error: "Failed to fetch subscriptions",
          details: error.message,
        },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        {
          error: "No push subscriptions found.",
        },
        { status: 404 }
      );
    }

    const payload = JSON.stringify({
      title: "🔔 Al Rehman Masjid",
      body: "This is a test background push notification.",
      url: "/",
    });

    const results = [];

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload
        );

        results.push({
          id: subscription.id,
          success: true,
        });
      } catch (error: any) {
        console.error(
          "Failed to send push:",
          error
        );

        results.push({
          id: subscription.id,
          success: false,
          statusCode: error?.statusCode,
        });

        if (
          error?.statusCode === 404 ||
          error?.statusCode === 410
        ) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent: results,
    });
  } catch (error) {
    console.error("Push test error:", error);

    return NextResponse.json(
      {
        error: "Failed to send test notification",
      },
      { status: 500 }
    );
  }
}