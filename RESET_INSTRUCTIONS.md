# How to Reset and Start Fresh

Follow these steps to completely reset your database and start from scratch:

## Step 1: Reset the Database

Run this command to reset your D1 database:

```bash
npx wrangler d1 execute feedback-db --local --file=./reset.sql
```

This will:
- Drop all existing tables (feedback, critical_feedback, themes, daily_metrics)
- Recreate all tables with fresh schema
- Clear all data

## Step 2: Clear KV Cache

The analytics cache is stored in KV. It will automatically clear when you seed/analyze, but you can manually clear it by visiting:

```
http://localhost:8787/api/seed
```

Or by restarting the dev server.

## Step 3: Seed Fresh Data

1. Start the dev server:
```bash
npx wrangler dev
```

2. Visit the dashboard:
```
http://localhost:8787
```

3. Seed the database by visiting:
```
http://localhost:8787/api/seed
```

This will insert 55 fresh feedback entries.

## Step 4: Analyze Feedback

Click the **"🤖 Analyze Feedback"** button in the dashboard.

This will:
- Analyze sentiment (positive/neutral/negative) with scores
- Extract themes (performance, ui_ux, pricing, bugs, etc.)
- Classify urgency (low/medium/high/critical)
- Automatically insert critical items into the `critical_feedback` table

## Step 5: View Results

After analysis completes:
- Dashboard shows all feedback with color-coded badges
- Critical items are flagged with pulsing red badges
- View critical items separately: `http://localhost:8787/api/critical`

## Color Grading System

### Sentiment Badges:
- 🟢 **Positive**: Green gradient with border
- 🟡 **Neutral**: Yellow gradient with border
- 🔴 **Negative**: Red gradient with border

### Urgency Badges:
- ⚪ **Low**: Gray gradient (subtle)
- 🟡 **Medium**: Yellow gradient
- 🟠 **High**: Orange gradient with shadow
- 🔴 **Critical**: Red gradient with pulsing animation (also saved to separate table)

## API Endpoints

- `GET /api/feedback` - All feedback items
- `GET /api/critical` - Only critical feedback (unresolved)
- `GET /api/analytics` - Dashboard metrics (cached)
- `POST /api/analyze` - Trigger AI analysis
- `GET /api/seed` - Seed mock data

## Troubleshooting

**If you see "table already exists" error:**
```bash
npx wrangler d1 execute feedback-db --local --command="DROP TABLE IF EXISTS feedback; DROP TABLE IF EXISTS critical_feedback; DROP TABLE IF EXISTS themes; DROP TABLE IF EXISTS daily_metrics;"
```

Then run the reset.sql file again.

**If analysis is slow:**
- This is normal - it processes each item with 3 AI calls + delays
- 57 items × 3 calls × 100ms delay = ~17 seconds minimum
- Workers AI rate limiting requires the delays

**If everything shows as neutral:**
- Check console logs for parsing errors
- The improved prompts should now work better
- Fallback keyword detection will catch most cases
