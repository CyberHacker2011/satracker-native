const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

// Only load dotenv locally
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
}

const app = express();

// Manual CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/", (req, res) => {
  res.send("SAT Tracker API Server is running!");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

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

  try {
    // A. Fetch all data in parallel batches
    const { data: usersData, error: usersError } =
      await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;
    const users = usersData.users;
    const userIds = users.map((u) => u.id);

    const [plansRes, logsRes, notifsRes, activityRes] = await Promise.all([
      supabase
        .from("study_plan")
        .select("*")
        .in("user_id", userIds)
        .or(`date.eq.${today},date.eq.${tomorrow}`),
      supabase
        .from("daily_log")
        .select("plan_id")
        .in("user_id", userIds)
        .eq("date", today),
      supabase
        .from("notifications")
        .select("user_id, message")
        .in("user_id", userIds)
        .gte("created_at", midnightUTC),
      supabase
        .from("user_activity")
        .select("user_id, last_seen_at")
        .in("user_id", userIds),
    ]);

    // B. Group data for O(1) lookup
    const plansByUsers = new Map();
    plansRes.data?.forEach((p) => {
      if (!plansByUsers.has(p.user_id)) plansByUsers.set(p.user_id, []);
      plansByUsers.get(p.user_id).push(p);
    });

    const logsSet = new Set(logsRes.data?.map((l) => l.plan_id));

    const notifSetByUsers = new Map();
    notifsRes.data?.forEach((n) => {
      if (!notifSetByUsers.has(n.user_id))
        notifSetByUsers.set(n.user_id, new Set());
      notifSetByUsers.get(n.user_id).add(n.message);
    });

    const activityByUsers = new Map(
      activityRes.data?.map((a) => [a.user_id, a.last_seen_at]),
    );

    const notificationsToInsert = [];
    const emailsToPromise = [];

    // C. Logic processing (Lightning Fast In-Memory)
    for (const user of users) {
      const userPlans = plansByUsers.get(user.id) || [];
      const userNotifs = notifSetByUsers.get(user.id) || new Set();
      const lastSeen = activityByUsers.get(user.id);

      // Check today's plans
      userPlans
        .filter((p) => p.date === today)
        .forEach((plan) => {
          const startTimePassed = hasTimePassed(plan.start_time, today);
          const endTimePassed = hasTimePassed(plan.end_time, today);
          const hasLog = logsSet.has(plan.id);

          if (startTimePassed && !endTimePassed && !hasLog) {
            const message = `Your ${plan.section} plan is starting at ${plan.start_time}.`;
            if (!userNotifs.has(message)) {
              notificationsToInsert.push({
                user_id: user.id,
                message,
                created_at: new Date().toISOString(),
              });

              // Should send email? (Smart Logic: skip if user was seen after notification would be sent)
              const shouldEmail = !lastSeen || new Date(lastSeen) < new Date();
              if (shouldEmail && user.email) {
                emailsToPromise.push(
                  sendEmail(user.email, "SAT Plan Starting", message),
                );
              }
            }
          }
        });

      // Check tomorrow's plans
      const hasTomorrowPlan = userPlans.some((p) => p.date === tomorrow);
      if (!hasTomorrowPlan) {
        const message = "You have not created a SAT study plan for tomorrow.";
        if (!userNotifs.has(message)) {
          notificationsToInsert.push({
            user_id: user.id,
            message,
            created_at: new Date().toISOString(),
          });

          if (user.email) {
            emailsToPromise.push(
              sendEmail(user.email, "No Plan for Tomorrow", message),
            );
          }
        }
      }
    }

    // D. Batch Save & Parallel Email (Max Performance)
    if (notificationsToInsert.length > 0) {
      await supabase.from("notifications").insert(notificationsToInsert);
    }

    const emailResults = await Promise.all(emailsToPromise);
    const emailsSentCount = emailResults.filter(Boolean).length;

    await supabase.from("cron_logs").insert({
      run_at: runStartTime,
      status: "success",
      users_processed: users.length,
      notifications_created: notificationsToInsert.length,
      emails_sent: emailsSentCount,
    });

    res.json({
      success: true,
      processed: users.length,
      notifications: notificationsToInsert.length,
      emails: emailsSentCount,
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
    const [authRes, profilesRes] = await Promise.all([
      supabase.auth.admin.listUsers(),
      supabase.from("user_profiles").select("*").eq("is_premium", true),
    ]);

    const emailMap = new Map(authRes.data?.users.map((u) => [u.id, u.email]));
    const now = new Date();
    const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

    const usersToRevoke = [];
    const usersToWarn = [];
    const emailsToPromise = [];

    for (const profile of profilesRes.data || []) {
      if (!profile.premium_expires_at) continue;
      const expiry = new Date(profile.premium_expires_at);
      const email = emailMap.get(profile.user_id);

      if (expiry < now) {
        usersToRevoke.push(profile.user_id);
        if (email)
          emailsToPromise.push(
            sendEmail(
              email,
              "Premium Expired",
              "Your premium subscription has expired. Renew now to continue studying.",
            ),
          );
      } else if (expiry < tomorrow) {
        // Warning logic (Optional but recommended)
        if (email)
          emailsToPromise.push(
            sendEmail(
              email,
              "Premium Expiring Soon",
              "Your premium subscription will expire in less than 24 hours.",
            ),
          );
      }
    }

    // Batch Revoke
    if (usersToRevoke.length > 0) {
      await supabase
        .from("user_profiles")
        .update({ is_premium: false })
        .in("user_id", usersToRevoke);
    }

    // Parallel Emails
    const emailResults = await Promise.all(emailsToPromise);
    const sentCount = emailResults.filter(Boolean).length;

    res.json({
      success: true,
      expired: usersToRevoke.length,
      emails_sent: sentCount,
    });
  } catch (error) {
    console.error("Premium Check Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`✓ API Server running locally on port ${PORT}`);
  });
}

module.exports = app;
