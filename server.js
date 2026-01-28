const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Helper for Resend emails since we can't use SDK with restricted keys easily
async function sendEmail(userEmail, subject, message) {
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
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #d97706;">SAT Tracker</h2>
            <h3 style="color: #333;">${subject}</h3>
            <p style="color: #666; font-size: 16px;">${message}</p>
            <div style="margin-top: 30px;">
              <a href="https://app.satracker.uz" style="background: #d97706; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">Open App</a>
            </div>
          </div>
        `,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

// Middleware for Cron Secret
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function hasTimePassed(hhmm, dateString) {
  const [h, m] = hhmm.split(":").map(Number);
  const targetDateTime = new Date(dateString + "T00:00:00");
  targetDateTime.setHours(h, m, 0, 0);
  return new Date() >= targetDateTime;
}

// 1. Dispatch Notifications
app.post("/api/dispatch_notifications", authMiddleware, async (req, res) => {
  const runStartTime = new Date().toISOString();
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
    .toISOString()
    .split("T")[0];
  const midnightUTC = `${today}T00:00:00.000Z`;

  let usersProcessed = 0;
  let notificationsCreated = 0;
  let emailsSent = 0;

  try {
    const { data: usersData, error: usersError } =
      await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    for (const user of usersData.users) {
      usersProcessed++;

      // A. Check for missed/starting plans
      const { data: todayPlans } = await supabase
        .from("study_plan")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today);

      if (todayPlans) {
        for (const plan of todayPlans) {
          const startTimePassed = hasTimePassed(plan.start_time, today);
          const endTimePassed = hasTimePassed(plan.end_time, today);

          // Get logs
          const { data: logs } = await supabase
            .from("daily_log")
            .select("id")
            .eq("plan_id", plan.id)
            .limit(1);

          const hasLog = logs && logs.length > 0;

          if (startTimePassed && !endTimePassed && !hasLog) {
            const message = `Your ${plan.section} plan is starting at ${plan.start_time}.`;
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", user.id)
              .eq("message", message)
              .gte("created_at", midnightUTC)
              .maybeSingle();

            if (!existing) {
              await supabase
                .from("notifications")
                .insert({
                  user_id: user.id,
                  message,
                  created_at: new Date().toISOString(),
                });
              notificationsCreated++;
              const sent = await sendEmail(
                user.email,
                "SAT Plan Starting",
                message,
              );
              if (sent) emailsSent++;
            }
          }
        }
      }

      // B. Check for no plan tomorrow
      const { data: tomorrowPlans } = await supabase
        .from("study_plan")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", tomorrow);
      if (!tomorrowPlans || tomorrowPlans.length === 0) {
        const message = "You have not created a SAT study plan for tomorrow.";
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", user.id)
          .eq("message", message)
          .gte("created_at", midnightUTC)
          .maybeSingle();
        if (!existing) {
          await supabase
            .from("notifications")
            .insert({
              user_id: user.id,
              message,
              created_at: new Date().toISOString(),
            });
          notificationsCreated++;
          const sent = await sendEmail(
            user.email,
            "No Plan for Tomorrow",
            message,
          );
          if (sent) emailsSent++;
        }
      }
    }

    await supabase
      .from("cron_logs")
      .insert({
        run_at: runStartTime,
        status: "success",
        users_processed: usersProcessed,
        notifications_created: notificationsCreated,
        emails_sent: emailsSent,
      });
    res.json({
      success: true,
      processed: usersProcessed,
      notifications: notificationsCreated,
      emails: emailsSent,
    });
  } catch (error) {
    console.error("Cron Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Check Premium Expiry
app.post("/api/check_premium_expiry", authMiddleware, async (req, res) => {
  const runStartTime = new Date().toISOString();
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const emailMap = new Map();
    authUsers.users.forEach((u) => emailMap.set(u.id, u.email));

    const { data: users } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("is_premium", true);
    let expiredCount = 0;
    const now = new Date();

    for (const profile of users || []) {
      if (!profile.premium_expires_at) continue;
      const expiry = new Date(profile.premium_expires_at);

      if (expiry < now) {
        await supabase
          .from("user_profiles")
          .update({ is_premium: false })
          .eq("user_id", profile.user_id);
        expiredCount++;
        const email = emailMap.get(profile.user_id);
        if (email)
          await sendEmail(
            email,
            "Premium Expired",
            "Your premium subscription has expired. Renew now to continue studying.",
          );
      }
    }

    res.json({ success: true, expired: expiredCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ API Server running on port ${PORT}`);
});
