# Uber Eats Integration — Final Steps

## 1. Apply Database Migration

```bash
# From project root
supabase db push
```

This creates:
- `uber_eats_tokens` — OAuth token cache
- `uber_eats_log` — API call audit log
- `uber_eats_events` — Raw webhook events
- `uber_eats_orders` — Orders from Uber

## 2. Set Environment Variables

In Supabase Dashboard → Edge Functions → Settings:

| Variable | Value | Source |
|----------|-------|--------|
| `UBER_EATS_CLIENT_ID` | Your Uber app Client ID | Uber Developer Portal |
| `UBER_EATS_CLIENT_SECRET` | Your Uber app Client Secret | Uber Developer Portal |
| `UBER_EATS_STORE_ID` | Your store UUID | Uber Merchant Portal |

## 3. Deploy Edge Functions

```bash
supabase functions deploy uber-eats-webhook
supabase functions deploy uber-eats-token
supabase functions deploy uber-eats-orders
```

## 4. Configure Webhook in Uber Developer Portal

1. Go to your Uber app → Webhooks
2. Add webhook URL:
   ```
   https://<your-project-ref>.supabase.co/functions/v1/uber-eats-webhook
   ```
3. Subscribe to events:
   - `orders.order_placed`
   - `orders.scheduled`
   - `orders.order_fulfilled`
   - `orders.cancel_order`
4. Set webhook secret (optional) — add `UBER_WEBHOOK_SECRET` env var if needed

## 5. Test Integration

### Test token endpoint:
```bash
curl https://<your-project-ref>.supabase.co/functions/v1/uber-eats-token
```

Should return: `{"access_token": "..."}`

### Test orders endpoint:
```bash
curl "https://<your-project-ref>.supabase.co/functions/v1/uber-eats-orders?endpoint=orders"
```

Should return recent orders from your store.

## 6. Admin Panel Integration

Add to `admin-os.js` to fetch Uber orders:

```javascript
async function loadUberOrders() {
  const { data } = await sb.functions.invoke('uber-eats-orders', {
    body: { endpoint: 'orders' }
  })
  // Render in admin dashboard
}
```

## API Endpoints

| Function | URL | Purpose |
|----------|-----|---------|
| `uber-eats-webhook` | `/functions/v1/uber-eats-webhook` | Receives Uber webhooks |
| `uber-eats-token` | `/functions/v1/uber-eats-token` | Returns cached OAuth token |
| `uber-eats-orders` | `/functions/v1/uber-eats-orders?endpoint=orders` | Fetch orders |
| `uber-eats-orders` | `/functions/v1/uber-eats-orders?endpoint=summary` | Daily summary (30d) |
| `uber-eats-orders` | `/functions/v1/uber-eats-orders?endpoint=store` | Store details |
| `uber-eats-orders` | `/functions/v1/uber-eats-orders?endpoint=menu` | Current menu |
