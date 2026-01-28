import { createClient } from "@supabase/supabase-js";

function getEmailHtml(subject: string, message: string) {
  const siteUrl =
    process.env.EXPO_PUBLIC_SITE_URL || "https://www.satracker.uz";
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${subject}</title>
</head>
<body style="font-family: sans-serif; background-color: #f9fafb; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h1 style="color: #d97706; text-align: center;">${subject}</h1>
        <p style="font-size: 16px; line-height: 1.5; color: #374151; text-align: center;">${message}</p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="${siteUrl}/premium" style="background-color: #d97706; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Renew Premium</a>
        </div>
    </div>
</body>
</html>
  `;
}

async function sendEmail(userEmail: string, subject: string, message: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "notifications@satracker.uz";

  if (!resendApiKey || !userEmail) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: userEmail,
        subject: subject,
        html: getEmailHtml(subject, message),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Resend API error:", data);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

export async function POST(request: Request) {
  const runStartTime = new Date().toISOString();
  let processed = 0;
  let expiredCount = 0;
  let warningCount = 0;
  let emailsSent = 0;

  try {
    // Auth check
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: "Missing config" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Get all auth users to have their emails (emails aren't in user_profiles)
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const emailMap = new Map();
    authUsers.users.forEach((u) => emailMap.set(u.id, u.email));

    // 2. Fetch premium users from profile table
    const { data: users, error: usersError } = await supabase
      .from("user_profiles")
      .select("user_id, is_premium, premium_expires_at")
      .eq("is_premium", true);

    if (usersError) throw usersError;

    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const profile of users || []) {
      processed++;
      const userEmail = emailMap.get(profile.user_id);
      if (!profile.premium_expires_at) continue;

      const expiryDate = new Date(profile.premium_expires_at);

      // 1. Check for expiration
      if (expiryDate < now) {
        // Revoke
        await supabase
          .from("user_profiles")
          .update({ is_premium: false })
          .eq("user_id", profile.user_id);

        expiredCount++;

        // Notify user of expiration
        const message =
          "Your Premium subscription has expired. Renew now to continue enjoying unlimited features.";
        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          message,
          created_at: new Date().toISOString(),
        });

        if (userEmail) {
          const sent = await sendEmail(userEmail, "Premium Expired", message);
          if (sent) emailsSent++;
        }
      }
      // 2. Check for warning (expires within 24 hours)
      else if (expiryDate < tomorrow) {
        // Check if we already warned today
        const warningMessage =
          "Your Premium subscription will expire in less than 24 hours.";
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", profile.user_id)
          .eq("message", warningMessage)
          .gte("created_at", todayStart.toISOString())
          .maybeSingle();

        if (!existing) {
          warningCount++;
          await supabase.from("notifications").insert({
            user_id: profile.user_id,
            message: warningMessage,
            created_at: new Date().toISOString(),
          });

          if (userEmail) {
            const sent = await sendEmail(
              userEmail,
              "Premium Expiring Soon",
              warningMessage,
            );
            if (sent) emailsSent++;
          }
        }
      }
    }

    // Log run
    await supabase.from("cron_logs").insert({
      run_at: runStartTime,
      status: "success",
      users_processed: processed,
      notifications_created: expiredCount + warningCount,
      emails_sent: emailsSent,
      error_message: `Expired: ${expiredCount}, Warnings: ${warningCount}`,
    });

    return Response.json({
      success: true,
      processed,
      expired: expiredCount,
      warnings: warningCount,
      emails: emailsSent,
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
