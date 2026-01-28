import { createClient } from "@supabase/supabase-js";

function getEmailHtml(subject: string, message: string) {
  const siteUrl =
    process.env.EXPO_PUBLIC_SITE_URL || "https://www.app.satracker.uz";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0;">
    <div style="max-width: 600px; width: 100%; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <a href="${siteUrl}" style="color: #d97706; font-size: 26px; font-weight: bold; text-decoration: none; font-family: ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif; letter-spacing: -0.5px;">SAT Tracker</a>
        </div>
        <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #f3f4f6;">
            <h1 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 24px; text-align: center; letter-spacing: -0.5px;">${subject}</h1>
            <p style="color: #4b5563; font-size: 16px; line-height: 26px; margin-bottom: 32px; text-align: center;">${message}</p>
            <div style="text-align: center;">
                <a href="${siteUrl}" style="display: inline-block; background-color: #d97706; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">Open SAT Tracker</a>
            </div>
        </div>
        <div style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 14px;">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} SAT Tracker. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTomorrowDateString() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hasTimePassed(hhmm: string, dateString: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;

  const planDate = new Date(dateString + "T00:00:00");
  const targetDateTime = new Date(planDate);
  targetDateTime.setHours(h, m, 0, 0);

  const now = new Date();
  return now >= targetDateTime;
}

async function sendEmail(userEmail: string, subject: string, message: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.RESEND_FROM_EMAIL || "notifications@satracker.uz";

  if (!resendApiKey || !userEmail) return false;

  try {
    // We use direct fetch to avoid Resend SDK doing any 'GET' requests which fails with restricted keys
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
  let usersProcessed = 0;
  let notificationsCreated = 0;
  let emailsSent = 0;
  let errorMessage: string | null = null;

  try {
    // Verify the request is authorized
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      errorMessage = "Missing Supabase configuration";
      return Response.json({ error: errorMessage }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const today = getTodayDateString();
    const tomorrow = getTomorrowDateString();

    // Get all users
    const { data: users, error: usersError } =
      await supabase.auth.admin.listUsers();

    if (usersError) {
      errorMessage = usersError.message;
      throw new Error(errorMessage);
    }

    if (!users || users.users.length === 0) {
      // Log successful run with no users
      await supabase.from("cron_logs").insert({
        run_at: runStartTime,
        status: "success",
        users_processed: 0,
        notifications_created: 0,
        emails_sent: 0,
      });
      return Response.json({ success: true, processed: 0 });
    }

    for (const user of users.users) {
      try {
        usersProcessed++;

        // 1. Check for missed check-ins (end_time has passed, no log exists)
        const { data: todayPlans, error: plansError } = await supabase
          .from("study_plan")
          .select("id, date, section, start_time, end_time")
          .eq("user_id", user.id)
          .eq("date", today);

        if (!plansError && todayPlans && todayPlans.length > 0) {
          const planIds = todayPlans.map((p) => p.id);

          const { data: logs, error: logsError } = await supabase
            .from("daily_log")
            .select("plan_id")
            .eq("user_id", user.id)
            .eq("date", today)
            .in("plan_id", planIds);

          if (!logsError) {
            const loggedPlanIds = new Set((logs || []).map((l) => l.plan_id));

            for (const plan of todayPlans) {
              const hasLog = loggedPlanIds.has(plan.id);

              // Check if plan start time has passed
              const startTimePassed = hasTimePassed(plan.start_time, today);
              const endTimePassed = hasTimePassed(plan.end_time, today);

              // Only notify about start if we're past start but before end
              if (startTimePassed && !endTimePassed && !hasLog) {
                const message = `Your ${plan.section} plan is starting at ${plan.start_time}. {{planId:${plan.id}}}`;

                const midnightUTC = `${today}T00:00:00.000Z`;

                // Check if notification already exists for this plan today
                const { data: existingStartNotif } = await supabase
                  .from("notifications")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("message", message)
                  .gte("created_at", midnightUTC)
                  .maybeSingle();

                if (!existingStartNotif) {
                  const now = new Date().toISOString();

                  const { data: notification, error: notifError } =
                    await supabase
                      .from("notifications")
                      .insert({
                        user_id: user.id,
                        message,
                        created_at: now,
                      })
                      .select()
                      .single();

                  if (!notifError && notification) {
                    notificationsCreated++;

                    const { data: activity } = await supabase
                      .from("user_activity")
                      .select("last_seen_at")
                      .eq("user_id", user.id)
                      .single();

                    let shouldSendEmail = false;
                    if (activity && activity.last_seen_at) {
                      const lastSeen = new Date(activity.last_seen_at);
                      const notifCreated = new Date(notification.created_at);
                      shouldSendEmail = lastSeen < notifCreated;
                    } else {
                      shouldSendEmail = true;
                    }

                    if (shouldSendEmail) {
                      const emailSent = await sendEmail(
                        user.email || "",
                        "SAT Plan Starting",
                        message.replace(/{{planId:.*?}}/g, ""),
                      );
                      if (emailSent) emailsSent++;
                    }
                  }
                }
              }

              // Check for missed check-ins (only one notification)
              if (endTimePassed && !hasLog) {
                const message = `Your ${plan.section} plan ending at ${plan.end_time} has no check-in.`;

                const midnightUTC = `${today}T00:00:00.000Z`;

                // Idempotency: Check if notification already exists for this plan today
                const { data: existingNotif } = await supabase
                  .from("notifications")
                  .select("id")
                  .eq("user_id", user.id)
                  .eq("message", message)
                  .gte("created_at", midnightUTC)
                  .maybeSingle();

                if (!existingNotif) {
                  const now = new Date().toISOString();

                  const { data: notification, error: notifError } =
                    await supabase
                      .from("notifications")
                      .insert({
                        user_id: user.id,
                        message,
                        created_at: now,
                      })
                      .select()
                      .single();

                  if (!notifError && notification) {
                    notificationsCreated++;

                    const { data: activity } = await supabase
                      .from("user_activity")
                      .select("last_seen_at")
                      .eq("user_id", user.id)
                      .single();

                    let shouldSendEmail = false;
                    if (activity && activity.last_seen_at) {
                      const lastSeen = new Date(activity.last_seen_at);
                      const notifCreated = new Date(notification.created_at);
                      shouldSendEmail = lastSeen < notifCreated;
                    } else {
                      shouldSendEmail = true;
                    }

                    if (shouldSendEmail) {
                      const emailSent = await sendEmail(
                        user.email || "",
                        "SAT Plan Not Checked In",
                        message,
                      );
                      if (emailSent) emailsSent++;
                    }
                  }
                }
              }
            }
          }
        }

        // 2. Check for no plan for tomorrow
        const { data: tomorrowPlans, error: tomorrowError } = await supabase
          .from("study_plan")
          .select("id")
          .eq("user_id", user.id)
          .eq("date", tomorrow);

        if (!tomorrowError) {
          const hasPlanForTomorrow = tomorrowPlans && tomorrowPlans.length > 0;

          if (!hasPlanForTomorrow) {
            const message =
              "You have not created a SAT study plan for tomorrow.";

            const midnightUTC = `${today}T00:00:00.000Z`;

            // Idempotency: Check if notification already exists today
            const { data: existingNotif } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", user.id)
              .eq("message", message)
              .gte("created_at", midnightUTC)
              .maybeSingle();

            if (!existingNotif) {
              const now = new Date().toISOString();

              const { data: notification, error: notifError } = await supabase
                .from("notifications")
                .insert({
                  user_id: user.id,
                  message,
                  created_at: now,
                })
                .select()
                .single();

              if (!notifError && notification) {
                notificationsCreated++;

                const { data: activity } = await supabase
                  .from("user_activity")
                  .select("last_seen_at")
                  .eq("user_id", user.id)
                  .single();

                let shouldSendEmail = false;
                if (activity && activity.last_seen_at) {
                  const lastSeen = new Date(activity.last_seen_at);
                  const notifCreated = new Date(notification.created_at);
                  shouldSendEmail = lastSeen < notifCreated;
                } else {
                  shouldSendEmail = true;
                }

                if (shouldSendEmail) {
                  const emailSent = await sendEmail(
                    user.email || "",
                    "No SAT Plan for Tomorrow",
                    message,
                  );
                  if (emailSent) emailsSent++;
                }
              }
            }
          }
        }
      } catch (userError) {
        // Continue with next user if one fails
        console.error(`Error processing user ${user.id}:`, userError);
      }
    }

    // Log successful run
    await supabase.from("cron_logs").insert({
      run_at: runStartTime,
      status: "success",
      users_processed: usersProcessed,
      notifications_created: notificationsCreated,
      emails_sent: emailsSent,
    });

    return Response.json({
      success: true,
      processed: usersProcessed,
      notificationsCreated,
      emails_sent: emailsSent,
    });
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Internal server error";

    // Log failed run
    try {
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
        await supabase.from("cron_logs").insert({
          run_at: runStartTime,
          status: "error",
          users_processed: usersProcessed,
          notifications_created: notificationsCreated,
          emails_sent: emailsSent,
          error_message: errorMessage,
        });
      }
    } catch (logError) {
      console.error("Error logging cron run:", logError);
    }

    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
