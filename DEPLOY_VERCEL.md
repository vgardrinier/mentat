# Deploy to Vercel - Quick Guide

**You already have:** Supabase, Stripe, Clerk accounts ✅
**You need:** Vercel account (create now, 5 min)

**Total time:** 15 minutes

---

## 🚀 Step 1: Create Vercel Account (2 min)

1. Go to: https://vercel.com
2. Click "Sign Up"
3. Use GitHub to sign in (easiest)
4. Authorize Vercel to access your repos

✅ Done!

---

## 🚀 Step 2: Deploy (3 min)

**Option A: Via Vercel Dashboard (Easiest)**

1. Click "Add New..." → Project
2. Import your GitHub repo: `vgardrinier/a2a_marketplace`
3. Configure:
   - **Framework:** Next.js (auto-detected)
   - **Root Directory:** `./`
   - **Build Command:** `npm run build` (auto-detected)
4. Click "Deploy"
5. Wait ~2 minutes

**Option B: Via CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from project root)
vercel

# Follow prompts, then:
vercel --prod
```

---

## 🔑 Step 3: Add Environment Variables (5 min)

**In Vercel Dashboard:**

1. Go to: Project → Settings → Environment Variables
2. Add each variable below:

```bash
# Database (from your Supabase)
DATABASE_URL
# Value: Your existing Supabase connection string

# Stripe (Test mode is fine for beta!)
STRIPE_PUBLISHABLE_KEY
# Value: Your existing pk_test_... key

STRIPE_SECRET_KEY
# Value: Your existing sk_test_... key

STRIPE_WEBHOOK_SECRET
# Value: Get new one - see below

# Clerk (from your production instance)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# Value: Your existing pk_... key

CLERK_SECRET_KEY
# Value: Your existing sk_... key

# Platform URL (your Vercel URL)
NEXT_PUBLIC_APP_URL
# Value: https://your-project.vercel.app
```

**For each variable:**
- Click "Add New"
- Name: (copy from above)
- Value: (paste your key)
- Environment: Select **Production**, **Preview**, **Development** (all three)
- Click "Save"

---

## 🔔 Step 4: Update Stripe Webhook URL (2 min)

**Your Stripe webhook currently points to localhost. Update it:**

1. Go to: Stripe Dashboard → Developers → Webhooks
2. Click your existing webhook OR create new one
3. Endpoint URL: `https://your-project.vercel.app/api/webhooks/stripe`
4. Events: `checkout.session.completed`
5. Copy the **Signing secret** (whsec_...)
6. Add to Vercel env vars: `STRIPE_WEBHOOK_SECRET`

---

## 🔄 Step 5: Redeploy with Env Vars (2 min)

**Environment variables only apply after redeploy:**

**Via Dashboard:**
1. Go to: Deployments → ... (latest) → Redeploy

**Via CLI:**
```bash
vercel --prod
```

Wait ~2 minutes for build.

---

## ✅ Step 6: Verify It Works (3 min)

**Test production deployment:**

1. **Visit your URL:** `https://your-project.vercel.app`
   - Should load homepage ✅
   - Click "Sign Up"
   - Should show Clerk signup ✅

2. **Test wallet:**
   - Sign up / Sign in
   - Go to /dashboard/wallet
   - Click "Add Funds"
   - Stripe checkout should load with your test keys ✅

3. **Test webhook:**
   ```bash
   stripe listen --forward-to https://your-project.vercel.app/api/webhooks/stripe

   # In another terminal:
   stripe trigger checkout.session.completed

   # Should see: ✓ Webhook delivered successfully
   ```

4. **Test worker registration:**
   - Go to: /dashboard/workers/register
   - Should show professional wizard ✅

---

## 🎯 You're Live!

**Your production URL is now:**
```
https://your-project.vercel.app
```

**Give this to your friend with:**
- Link to GETTING_STARTED.md
- Tell them: "Sign up, add $10 test funds, install MCP, try it out"

---

## 📊 What to Monitor

**Vercel Dashboard:**
- Deployments → Check for errors
- Analytics → See traffic
- Logs → Real-time errors

**Stripe Dashboard:**
- Webhooks → Events → Verify deliveries
- Payments → See test transactions

**Clerk Dashboard:**
- Users → See signups

---

## 🔧 Common Issues

**"Internal Server Error"**
- Check Vercel logs: Deployments → Function Logs
- Usually: missing environment variable

**"Database connection failed"**
- Verify DATABASE_URL is correct
- Check Supabase project is running
- Use Transaction mode connection string

**"Clerk authentication not working"**
- Verify both Clerk keys are set
- Check NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY starts with pk_
- Redeploy after adding keys

**"Stripe webhook failed"**
- Verify webhook URL matches your Vercel URL
- Check STRIPE_WEBHOOK_SECRET matches webhook signing secret
- Check webhook endpoint is `/api/webhooks/stripe` exactly

---

## 🎉 Quick Deploy Checklist

**Before deployment:**
- [x] Code pushed to GitHub ✅
- [ ] Vercel account created

**During deployment:**
- [ ] Import repo in Vercel
- [ ] Add all 7 environment variables
- [ ] Update Stripe webhook URL
- [ ] Redeploy

**After deployment:**
- [ ] Test signup
- [ ] Test add funds
- [ ] Test webhook delivery
- [ ] Test worker registration
- [ ] Share with friend!

**Time:** 15 minutes total

---

## 💡 Pro Tips

**1. Use Vercel Preview Deployments**
- Every git push creates a preview URL
- Test changes before pushing to production
- Each branch gets its own URL

**2. Monitor Real-Time**
```bash
vercel logs --follow
# See live logs as requests come in
```

**3. Environment Variables per Environment**
- Use test Stripe keys for Preview deployments
- Use production Stripe keys only for Production

**4. Database Migrations**
```bash
# Run migrations on production DB:
DATABASE_URL="your-production-url" npm run db:migrate
```

---

**Ready to deploy?** Follow the checklist above and you'll be live in 15 minutes!
