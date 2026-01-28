# SAT Tracker - API Routes (Web Only)

## ⚠️ IMPORTANT: How API Routes Work in Expo

**Expo API routes work in TWO scenarios:**

1. ✅ **Development mode** with Expo dev server (`expo start --web`)
2. ✅ **Production** when deployed to platforms like Vercel, Netlify, etc.

**They DO NOT work with:**

- ❌ Static file serving (Electron serves static files)
- ❌ Production builds served locally without a server

## Solution: Use Expo Dev Server for Testing

### Testing Locally (Development):

```bash
# Start Expo web dev server (API routes work here!)
pnpm web
```

Then open http://localhost:8081 and:

- Navigate to `/test-api` to use the testing interface
- Or use curl:

```cmd
curl -X POST http://localhost:8081/api/dispatch_notifications -H "Authorization: Bearer 4f18426e26ac997e625ffe51f196474a5d36ee2507f02c821d7c4fbe878303f9cda4045cae606000c84d2bbdd5cc05ae0e067c20f2d2efa2d84c1b645dsf82fc97cb255ce32284c58ecb3efc3a7a5102"
```

```cmd
curl -X POST http://localhost:8081/api/check_premium_expiry -H "Authorization: Bearer 4f18426e26ac997e625ffe51f196474a5d36ee2507f02c821d7c4fbe878303f9cda4045cae606000c84d2bbdd5cc05ae0e067c20f2d2efa2d84c1b645dsf82fc97cb255ce32284c58ecb3efc3a7a5102"
```

## Available Endpoints

### 1. `/api/dispatch_notifications` ✅

**What it does:**

- ✅ Sends "plan starting" notifications when `start_time` passes
- ✅ Sends "missed check-in" notifications when `end_time` passes & no log exists
- ✅ Sends "create tomorrow's plan" reminder (ONCE PER DAY per user)
- ✅ Uses Resend to email users who haven't opened the app
  - Checks `user_activity.last_seen_at`
  - If `last_seen_at < notification.created_at` → Send email
- ✅ Logs everything to `cron_logs` table

### 2. `/api/check_premium_expiry` ✅

**What it does:**

- ✅ **EXPIRES premium** by setting `is_premium = false` when `premium_expires_at < now`
- ✅ Sends 24-hour warning before expiration
- ✅ Creates notifications and sends emails via Resend
- ✅ Logs all actions to `cron_logs`

### 3. `/api/create_notification`

**What it does:**

- ✅ Creates a notification for a user
- ✅ Prevents duplicates (won't create same message twice in one day)

**Request:**

```json
{
  "user_id": "uuid",
  "message": "Your notification message"
}
```

## Testing in Development

### Using the Web Interface:

1. Start dev server:

   ```bash
   pnpm web
   ```

2. Open http://localhost:8081/test-api

3. Click "Play" buttons to test each API

### Using curl (Windows CMD):

Start dev server first:

```bash
pnpm web
```

Then in another terminal:

**Test dispatch (one line, no backslashes):**

```cmd
curl -X POST http://localhost:8081/api/dispatch_notifications -H "Authorization: Bearer 4f18426e26ac997e625ffe51f196474a5d36ee2507f02c821d7c4fbe878303f9cda4045cae606000c84d2bbdd5cc05ae0e067c20f2d2efa2d84c1b645dsf82fc97cb255ce32284c58ecb3efc3a7a5102"
```

**Test premium expiry:**

```cmd
curl -X POST http://localhost:8081/api/check_premium_expiry -H "Authorization: Bearer 4f18426e26ac997e625ffe51f196474a5d36ee2507f02c821d7c4fbe878303f9cda4045cae606000c84d2bbdd5cc05ae0e067c20f2d2efa2d84c1b645dsf82fc97cb255ce32284c58ecb3efc3a7a5102"
```

**Test create notification:**

```cmd
curl -X POST http://localhost:8081/api/create_notification -H "Content-Type: application/json" -d "{\"user_id\":\"YOUR_USER_ID\",\"message\":\"Test notification\"}"
```

## Production Deployment

Deploy to **Vercel** (recommended for Expo API routes):

1. Install Vercel CLI:

   ```bash
   npm i -g vercel
   ```

2. Deploy:

   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard

4. Your APIs will be at: `https://your-app.vercel.app/api/*`

### Set up Cron Jobs (cron-job.org):

**Dispatch Notifications** - Every 30 minutes:

- URL: `https://your-app.vercel.app/api/dispatch_notifications`
- Method: POST
- Header: `Authorization: Bearer YOUR_CRON_SECRET`
- Schedule: `*/30 * * * *`

**Check Premium Expiry** - Daily at midnight:

- URL: `https://your-app.vercel.app/api/check_premium_expiry`
- Method: POST
- Header: `Authorization: Bearer YOUR_CRON_SECRET`
- Schedule: `0 0 * * *`

## Environment Variables

Create `.env.local`:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://bjxroikxfcrrislsatwl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cron Secret
CRON_SECRET=4f18426e26ac997e625ffe51f196474a5d36ee2507f02c821d7c4fbe878303f9cda4045cae606000c84d2bbdd5cc05ae0e067c20f2d2efa2d84c1b645dsf82fc97cb255ce32284c58ecb3efc3a7a5102

# Email (Resend)
RESEND_API_KEY=re_RJ9PGC8e_3VCr9NnRJreXMe579geGtwQS
RESEND_FROM_EMAIL=no-reply@satracker.uz

# Site URL
EXPO_PUBLIC_SITE_URL=https://app.satracker.uz/
```

## Expected Responses

### Success:

```json
{
  "success": true,
  "processed": 10,
  "notificationsCreated": 5,
  "emails_sent": 2
}
```

### Unauthorized (wrong CRON_SECRET):

```json
{
  "error": "Unauthorized"
}
```

## Monitoring

Query `cron_logs` in Supabase:

```sql
SELECT * FROM cron_logs
ORDER BY run_at DESC
LIMIT 10;
```

## Summary

- ✅ **Development**: Use `pnpm web` (Expo dev server)
- ✅ **Production**: Deploy to Vercel or similar platform
- ❌ **Don't use**: Built static files with Electron for API testing
- ✅ **Emails**: Sent via Resend to users who haven't opened app
- ✅ **Premium Expiry**: Actually sets `is_premium = false` in database
- ✅ **Notifications**: One per day for "no tomorrow plan" reminder
