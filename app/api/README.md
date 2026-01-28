# SAT Tracker - Backend Logic (Supabase Edge Functions)

The backend logic for automated notifications and premium management has been migrated to **Supabase Edge Functions** for maximum reliability and ease of deployment.

## Why Supabase Edge Functions?

- ✅ **Reliability**: They run in a stable environment, independent of your local bundler or web hosting.
- ✅ **Security**: They use Supabase's secure environment and can safely use your `SERVICE_ROLE_KEY`.
- ✅ **Scalability**: They auto-scale to handle any number of users.
- ✅ **Ease of Cron**: They are designed to be called by external cron services.

## Available Functions

### 1. `dispatch-notifications`

**Endpoint**: `https://bjxroikxfcrrislsatwl.supabase.co/functions/v1/dispatch-notifications`
**Method**: POST
**Auth**: `Authorization: Bearer <CRON_SECRET>`

**Functionality**:

- Checks today's study plans for all users.
- Sends "Plan Starting" notifications when a plan's start time is reached.
- Sends "Missed Check-in" notifications when a plan's end time is reached without a log.
- Sends "No Plan for Tomorrow" reminders if no plan is scheduled for the next day.
- **Smart Email Logic**: Sends an email via Resend if the user hasn't opened the app recently (`last_seen_at` check).

---

### 2. `check-premium-expiry`

**Endpoint**: `https://bjxroikxfcrrislsatwl.supabase.co/functions/v1/check-premium-expiry`
**Method**: POST
**Auth**: `Authorization: Bearer <CRON_SECRET>`

**Functionality**:

- Checks all premium users.
- **Revokes Premium**: If the expiry date has passed, it sets `is_premium = false`, clears the expiry date, and notifies the user.
- **Expiry Warning**: If premium expires in less than 24 hours, it sends a warning notification and email.

---

### 3. `create-notification`

**Endpoint**: `https://bjxroikxfcrrislsatwl.supabase.co/functions/v1/create-notification`
**Method**: POST
**Auth**: None (Uses internal logic)

**Request Body**:

```json
{
  "user_id": "uuid-of-user",
  "message": "Notification message text"
}
```

**Functionality**:

- Creates a notification in the database.
- **Deduplication**: Won't create the same notification for the same user on the same day.

## Deployment Instructions

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login & Link Project

```bash
supabase login
supabase link --project-ref bjxroikxfcrrislsatwl
```

### 3. Set Edge Function Secrets

You must set these secrets in your Supabase project for the functions to work:

```bash
supabase secrets set CRON_SECRET="your-very-long-secret-key"
supabase secrets set RESEND_API_KEY="re_..."
supabase secrets set RESEND_FROM_EMAIL="no-reply@satracker.uz"
supabase secrets set SITE_URL="https://app.satracker.uz"
```

### 4. Deploy Functions

```bash
supabase functions deploy dispatch-notifications
supabase functions deploy check-premium-expiry
supabase functions deploy create-notification
```

## Setup Cron Jobs (Recommended)

Use a service like **cron-job.org** to automate these functions:

1. **Dispatch Notifications** (Every 30-60 minutes):
   - **URL**: `https://bjxroikxfcrrislsatwl.supabase.co/functions/v1/dispatch-notifications`
   - **Method**: POST
   - **Header**: `Authorization: Bearer <CRON_SECRET>`

2. **Check Premium Expiry** (Once per day):
   - **URL**: `https://bjxroikxfcrrislsatwl.supabase.co/functions/v1/check-premium-expiry`
   - **Method**: POST
   - **Header**: `Authorization: Bearer <CRON_SECRET>`

## Testing Locally

You can test these functions locally using the Supabase CLI:

```bash
supabase functions serve
```

Then use `curl` to call the local endpoint (usually `http://localhost:54321/functions/v1/...`).
