# MASH Track Command Center

Digital coaching operations system for Medford Area Senior High Raiders Track & Field — 2026 Season.

## Features

- **⚡ Today** — Daily dashboard with action items, athlete alerts, 7-day weather forecast for Medford + next meet location
- **🏟️ Meets** — Full 16-meet schedule with deadlines, bus times, entry platforms
- **👤 Roster** — 48 athletes with full profiles (PRs, injuries, goals, phone, emergency contacts, R.A.I.D.E.R.S. values, schedule conflicts). Click any athlete for detail view
- **🍽️ Plans** — AI-generated personalized meal + workout plans per athlete based on their actual data
- **📱 Message** — TeamReach message composer with templates and copy-to-clipboard
- **🤖 AI Coach** — Claude-powered coaching assistant with full program knowledge

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "MASH Track Command Center v3"
git remote add origin https://github.com/YOUR-USERNAME/mash-command-center.git
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project"
3. Import your `mash-command-center` repository
4. **Add Environment Variable:**
   - Key: `ANTHROPIC_API_KEY`
   - Value: Your API key from [console.anthropic.com](https://console.anthropic.com)
5. Click "Deploy"

### 3. Custom Domain (optional)

In Vercel project settings → Domains → Add `mash.stokhausmedia.com` or `stokhausmedia.com/mash`

Then in Cloudflare, add a CNAME record pointing to `cname.vercel-dns.com`

## Local Development

```bash
npm install
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

- **Framework:** Next.js 14 (App Router)
- **API Routes:** Server-side Claude API proxy (keeps API key secure)
  - `/api/ai` — AI coaching assistant
  - `/api/meal` — Personalized meal plan generator
  - `/api/workout` — Personalized workout plan generator
- **Weather:** Open-Meteo API (free, no key needed)
- **Data:** All 48 athlete profiles from Google Form embedded in `lib/data.js`
- **State:** localStorage for persistent action items, athlete statuses, AI chat history

## Coaching Staff

- James Stokes — Head Coach (Jumps / Overall)
- Katie Losiewicz — Assistant
- Greg Klapatauskas — Assistant (Distance)
- Dilan Schneider — Assistant (Sprints / Hurdles)
- Hallie Eisfeldt — Assistant (Sprints / Hurdles)

---

**E + R = O · 1% Better Every Day · Go Raiders 🏴‍☠️**
