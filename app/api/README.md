# SAT Tracker Native - API Routes

This directory contains serverless API endpoints for the SAT Tracker Native app using Expo Router's API Routes feature.

## Available Endpoints

### 1. Create Notification API
**Endpoint:** `/api/create_notification`  
**Method:** POST  
**File:** `create_notification+api.ts`

Creates a new notification for a user, with built-in deduplication to prevent duplicate notifications on the same day.

**Request Body:**
```json
{
  "user_id": "string",
  "message": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* notification object */ }
}
```

**Features:**
- Deduplication: Checks if the same notification already exists for the user today
- Uses Supabase service role key for admin-level operations
- Returns appropriate error messages for missing configuration or fields

---

### 2. Dispatch Notifications API
**Endpoint:** `/api/dispatch_notifications`  
**Method:** POST  
**File:** `dispatch_notifications+api.ts`

Automated endpoint for dispatching study plan-related notifications. This is meant to be called by a cron job.

**Request Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "processed": 10,
  "notificationsCreated": 5,
  "emails_sent": 3
}
```

**Features:**
- **Plan Start Notifications**: Notifies users when their study plan is starting
- **Missed Check-in Notifications**: Alerts users who haven't checked in for completed study plans
- **Tomorrow's Plan Reminder**: Reminds users if they haven't created a plan for tomorrow
- **Smart Email Sending**: Automatically sends emails to users who are inactive (on web/desktop)
  - Checks `user_activity.last_seen_at` timestamp
  - Sends email only if user was last seen *before* the notification was created
  - Ensures users on mobile get push notifications while web/desktop users get emails
- **Logging**: Records all runs in the `cron_logs` table
- **Error Handling**: Continues processing if individual user operations fail

---

## Environment Variables Required

Make sure these environment variables are set in your `.env.local` file:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: For cron job authentication
CRON_SECRET=your_secret_key

# Email Configuration (for web/desktop notifications)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=notifications@yourdomain.com

# Optional: Site URL for email templates
EXPO_PUBLIC_SITE_URL=https://www.satracker.uz
```

## Setting Up Cron Jobs

For the `dispatch_notifications` endpoint to work automatically, you'll need to set up a cron job service (like Vercel Cron, GitHub Actions, or any other cron service) to call this endpoint regularly.

**Example using curl:**
```bash
curl -X POST https://your-expo-app-url/api/dispatch_notifications \
  -H "Authorization: Bearer your_cron_secret"
```

## Differences from Web App

The native app API routes have these key differences from the Next.js web app:

1. **Smart Email Logic**: Emails are sent based on user activity
   - If user is active (recently seen), they receive in-app/push notifications
   - If user is inactive, they receive email notifications
   - This works seamlessly across mobile, web, and desktop platforms
2. **Expo Router Syntax**: Uses `+api.ts` suffix instead of `route.ts`
3. **Response API**: Uses `Response.json()` instead of `NextResponse.json()`
4. **Environment Variables**: Uses `EXPO_PUBLIC_SUPABASE_URL` instead of `NEXT_PUBLIC_SUPABASE_URL`

## Testing

To test these endpoints locally:

1. Start your Expo development server:
```bash
pnpm start
```

2. Make requests to the endpoints:
```bash
# Create notification
curl -X POST http://localhost:8081/api/create_notification \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-uuid", "message": "Test notification"}'

# Dispatch notifications (with cron secret)
curl -X POST http://localhost:8081/api/dispatch_notifications \
  -H "Authorization: Bearer your_cron_secret"
```

## Database Schema Requirements

These APIs require the following Supabase tables:

- `notifications` - Stores user notifications
- `study_plan` - Stores user study plans
- `daily_log` - Stores daily check-in logs
- `cron_logs` - Stores cron job execution logs
- `user_activity` - Tracks user activity (used for email decision in web app)

Make sure your Row Level Security (RLS) policies allow the service role to perform the necessary operations.
