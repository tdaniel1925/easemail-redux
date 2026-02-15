# SPEC-BILLING.md — EaseMail v2

---

## BILLING SYSTEM

Stripe only. No PayPal. No crypto.

### PLANS

Pricing is placeholder — use `system_settings` values so it can be changed without deploy.

| Plan | Individual Price | Per-Seat Price (Org) | Annual Discount |
|---|---|---|---|
| FREE | $0 | N/A | N/A |
| PRO | $X/month | $X/user/month | 20% off |
| BUSINESS | $X/month | $X/user/month | 20% off |
| ENTERPRISE | Custom | Custom | Custom |

**Stripe price IDs (env vars):**
```
STRIPE_PRO_PRICE_ID=           # Monthly Pro individual/per-seat
STRIPE_PRO_ANNUAL_PRICE_ID=    # Annual Pro
STRIPE_BUSINESS_PRICE_ID=      # Monthly Business
STRIPE_BUSINESS_ANNUAL_PRICE_ID= # Annual Business
```

### BILLING TYPES

**1. Individual billing:**
- User subscribes directly
- `subscriptions.user_id` = their user ID
- `subscriptions.organization_id` = NULL
- Manages via Settings > Billing

**2. Organization billing:**
- Org owner subscribes for the org
- `subscriptions.organization_id` = org ID
- `subscriptions.user_id` = NULL
- Seat-based: `quantity = seats`
- Manages via Settings > Organization > Billing
- All org members get the org's plan level

### CHECKOUT FLOW

**Individual:**
```
1. User clicks "Upgrade to Pro" on /app/pricing
2. POST /api/billing/individual/create
   - Create or get Stripe customer (by user email)
   - Create Checkout Session (mode=subscription, quantity=1)
3. Redirect to Stripe Checkout
4. On success → Stripe webhook fires
5. customer.subscription.created → create subscriptions row
6. Update user plan-related limits
```

**Organization:**
```
1. Org owner clicks "Upgrade" in org settings
2. POST /api/billing/organization/create
   - Create or get Stripe customer (by billing_email)
   - Create Checkout Session (mode=subscription, quantity=seats)
3. Redirect to Stripe Checkout
4. On success → webhook creates subscription linked to org
5. All org members inherit the plan
```

### SEAT MANAGEMENT

**Add seat (org owner adds member):**
```typescript
// After adding member to org:
if (org.stripe_subscription_id) {
  const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
  const item = subscription.items.data[0];
  await stripe.subscriptions.update(org.stripe_subscription_id, {
    items: [{ id: item.id, quantity: org.seats_used + 1 }],
    proration_behavior: 'always_invoice',
  });
}
// Update org: seats_used += 1
```

**Remove seat:**
```typescript
// After removing member:
if (org.stripe_subscription_id) {
  const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
  const item = subscription.items.data[0];
  await stripe.subscriptions.update(org.stripe_subscription_id, {
    items: [{ id: item.id, quantity: Math.max(1, org.seats_used - 1) }],
    proration_behavior: 'always_invoice',
  });
}
// Update org: seats_used -= 1
```

### STRIPE WEBHOOK HANDLER

```typescript
// app/api/webhooks/stripe/route.ts
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient(); // service role for writes

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = sub.metadata.organization_id;
      const userId = sub.metadata.user_id;

      await supabase.from('subscriptions').upsert({
        stripe_subscription_id: sub.id,
        stripe_customer_id: sub.customer as string,
        organization_id: orgId || null,
        user_id: userId || null,
        plan: mapStripePriceToPlan(sub.items.data[0].price.id),
        status: mapStripeStatus(sub.status),
        seats: sub.items.data[0].quantity || 1,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
        trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      }, { onConflict: 'stripe_subscription_id' });

      // Update org plan if org billing
      if (orgId) {
        await supabase.from('organizations').update({
          plan: mapStripePriceToPlan(sub.items.data[0].price.id),
          subscription_status: mapStripeStatus(sub.status),
        }).eq('id', orgId);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('subscriptions').update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      }).eq('stripe_subscription_id', sub.id);

      // Downgrade org to FREE
      if (sub.metadata.organization_id) {
        await supabase.from('organizations').update({
          plan: 'FREE',
          subscription_status: 'canceled',
        }).eq('id', sub.metadata.organization_id);
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      await supabase.from('invoices').upsert({
        stripe_invoice_id: invoice.id,
        subscription_id: await getSubscriptionIdByStripeId(invoice.subscription as string),
        amount_cents: invoice.amount_paid,
        currency: invoice.currency,
        status: 'paid',
        description: invoice.description || `Invoice for ${invoice.lines.data[0]?.description}`,
        period_start: new Date(invoice.period_start * 1000).toISOString(),
        period_end: new Date(invoice.period_end * 1000).toISOString(),
        paid_at: new Date().toISOString(),
        pdf_url: invoice.invoice_pdf,
      }, { onConflict: 'stripe_invoice_id' });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      // Find subscription and update status
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id, organization_id, user_id')
        .eq('stripe_subscription_id', invoice.subscription)
        .single();

      if (sub) {
        await supabase.from('subscriptions').update({ status: 'past_due' }).eq('id', sub.id);

        if (sub.organization_id) {
          await supabase.from('organizations').update({ subscription_status: 'past_due' }).eq('id', sub.organization_id);
        }

        // Notify owner
        const notifyUserId = sub.user_id || await getOrgOwnerId(sub.organization_id);
        if (notifyUserId) {
          await supabase.from('notification_queue').insert({
            user_id: notifyUserId,
            type: 'warning',
            title: 'Payment Failed',
            message: 'Your subscription payment failed. Please update your payment method.',
            link: '/app/settings/billing',
          });
          // Send email via Resend
        }
      }
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription;
      // Send trial ending email (3 days before)
      const notifyUserId = sub.metadata.user_id || await getOrgOwnerId(sub.metadata.organization_id);
      if (notifyUserId) {
        // Send Resend email + in-app notification
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

### BILLING UI PAGES

**Individual: `/app/settings/billing`**
- Current plan card (plan name, price, renewal date)
- Usage stats (AI uses, accounts, etc.)
- "Upgrade" / "Downgrade" buttons → Stripe Checkout or portal
- Payment method card (last 4, brand, exp) with "Update" → Stripe portal
- Invoice history table with PDF download links
- "Cancel subscription" with confirmation dialog

**Organization: `/app/settings/organization/billing`**
- Same as individual but shows:
  - Seats used / total
  - Per-seat pricing
  - "Add seats" button (inline increment)
  - Member list with seat allocation

**Stripe Customer Portal (for self-service):**
```typescript
// POST /api/billing/portal
const session = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${APP_URL}/app/settings/billing`,
});
return NextResponse.json({ url: session.url });
```
Users can update payment method, view invoices, cancel subscription through Stripe's hosted portal.

### PRICING PAGE

**Route:** `/app/pricing` (also accessible as `/pricing` on marketing site)

**Layout:** 3 plan columns (FREE / PRO / BUSINESS) + "Enterprise" CTA

Each column:
- Plan name + price
- Monthly/Annual toggle (shows discounted annual price)
- Feature list with checkmarks
- CTA button: "Current Plan" (disabled) / "Upgrade" / "Contact Sales"

**Enterprise CTA:** Opens modal form → creates enterprise_leads row.

### FREE PLAN RESTRICTIONS

When user is on FREE plan, certain UI elements are gated:

```typescript
// components/features/plan-gate.tsx
interface PlanGateProps {
  required: PlanType;
  children: React.ReactNode;
  fallback?: React.ReactNode; // Shows upgrade prompt
}

export function PlanGate({ required, children, fallback }: PlanGateProps) {
  const { plan } = useUserPlan();
  const planOrder = { FREE: 0, PRO: 1, BUSINESS: 2, ENTERPRISE: 3 };

  if (planOrder[plan] >= planOrder[required]) {
    return <>{children}</>;
  }

  return fallback || (
    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
      <p className="text-sm text-blue-700">
        This feature requires {required} plan.
        <Link href="/app/pricing" className="ml-1 font-medium underline">Upgrade</Link>
      </p>
    </div>
  );
}
```

**Gated features (show upgrade prompt):**
- AI Remix/Dictate (after daily limit hit)
- Scheduled sends button
- Email rules (after 3 rules)
- Additional email account connection
- SMS tab
- Command palette
- Advanced search operators
- Webhooks/API keys
