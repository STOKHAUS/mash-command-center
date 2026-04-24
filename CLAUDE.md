# MASH Track Command Center

Operational dashboard for Medford Area Senior High School (MASH) Track & Field. Next.js app deployed on Vercel. Used by Head Coach James Stokes to run the 2026 outdoor season.

**Live:** https://mash-command-center-zeta.vercel.app

---

## Program Context

- **School:** Medford Area Senior High School, Medford, Wisconsin
- **Conference:** Great Northern Conference (GNC)
- **Season:** 2026 outdoor track (spring — March through May/June)
- **Head Coach:** James Stokes (first-year head coach, former jumps coach)
- **Roster:** ~34 boys, 24 girls varsity/JV combined
- **Mottos:** "E + R = O" (Event + Response = Outcome) · "1% Better Every Day"
- **Values framework:** R.A.I.D.E.R.S.

### Coaching Staff

| Coach | Group |
|---|---|
| James Stokes | Head Coach / Distance (floats between groups) |
| Katie Losiewicz | High Jump |
| Greg Klapatauskas | Long Jump + Triple Jump (+ distance support) |
| Hallie Eisfeldt | Sprints + Hurdles + Attendance |
| Dilan Schneider ("Coach D") | Throws |

### Key External Contacts

- **Ben Corcoran** (meet management): 715-897-0861
- **Matt Frey** (Star News sports reporter): meet recap articles
- **Ryan Pilgrim** (concessions/financials)
- **Kyle Steiner** (Northern Badger / UW-Stout meet director): steinerky@uwstout.edu, 262-365-3759
- **Logan Gullickson** (PTtiming support): logan@pttiming.com
- **Dave Hauser** (UWSP Distance Carnival meet director): dhauser@pointschools.net
- **Casey Hartl** (Activities assistant — bus/travel logistics)

---

## Architecture

**Stack:** Next.js 14 (App Router) · React 18 · deployed on Vercel with auto-deploy on push to `main`.

### File Structure

```
/
├── lib/
│   └── data.js          ← Primary data file. All exports live here.
├── app/
│   ├── page.js          ← Main UI component. Imports from ../lib/data.js
│   ├── layout.js
│   ├── globals.css
│   ├── api/             ← API routes
│   └── references/      ← References page
├── public/
├── athlete-profiles.json
├── mash-command-center.html  ← Standalone backup (pre-Next.js version)
├── package.json
├── next.config.js
└── vercel.json
```

**Note:** Despite Next.js conventions, this repo does NOT use a `src/` directory. Files are at root level: `/lib/data.js`, `/app/page.js`.

### Exports from `lib/data.js`

| Export | Purpose |
|---|---|
| `FORM_DATA` | Athlete survey data (PRs, injuries, goals, emergency contacts) |
| `MEETS` | Meet schedule with dates, locations, start times, bus times, deadlines |
| `LOCATIONS` | Venue details |
| `ACTIONS` | Coach action items with due dates + priority |
| `KNOWN_STATUS` | Baseline athlete status overrides |
| `RESULTS` | Meet results (built from parsed raw results after each meet) |
| `CONFLICTS` | Coach PTO / conflicts calendar |
| `GUIDE_URLS` | Meet-day guide URLs by meetId |
| `RESULTS_URLS` | Results page URLs by meetId |
| `BADGER_BOYS` / `BADGER_GIRLS` | Northern Badger lineups (meetId 3) |
| `STOUT_BOYS` / `STOUT_GIRLS` | Stout Elite lineups (meetId 4) |
| `HOMEINVITE2_BOYS` / `HOMEINVITE2_GIRLS` | Home Invite #2 lineups (meetId 8) |
| `PROBATION` | Academic probation tracker |

### `getLineups()` in `app/page.js`

Handles combined boys/girls meets. Maps `meetId` → exported lineup arrays. When adding a new combined meet, wire it here.

---

## Deploy Flow

1. Edit `lib/data.js` and/or `app/page.js`
2. Commit and push to `main`
3. Vercel auto-deploys in ~15 seconds
4. Verify at https://mash-command-center-zeta.vercel.app

```bash
# Standard deploy flow
git add lib/data.js app/page.js
git commit -m "feat: Home Invite #2 results"
git push origin main
```

---

## Critical Rules (Non-Negotiable)

### 1. WIAA Event Limit Rule — Flag on Sight

**4 total events max per athlete per meet.** Within that 4:
- Max 3 **running events** (relays count as running)
- Up to 4 **field events** allowed if no running events

When building or modifying any lineup export, validate this rule and flag violations before suggesting changes. Never produce a lineup that exceeds it without explicit confirmation.

### 2. Squarespace CSS Override (for standalone HTML files only)

Standalone HTML files hosted at `stokhausmedia.com/mash-track` (NOT this Next.js app) MUST use `!important` on every `color`, `background`, `background-color`, `border-color`, and `border` property. Squarespace injects black text on dark backgrounds without it. This rule does NOT apply to this Next.js app (which is hosted on Vercel), but comes up when James asks for standalone HTML deliverables.

### 3. Voice & Tone (for any content — Star News articles, coach emails, TeamReach messages)

- Calm, confident, direct
- Not hypey, not salesy
- Short paragraphs, clean structure
- Challenge when needed — truth over affirmation
- No exaggerated claims

### 4. Sensitive Data

Never commit:
- Athlete phone numbers, emergency contacts, addresses to public-facing UI
- Parent contact info
- Medical details beyond a general status (`injured`, `limited`, `modified`, etc.)

`FORM_DATA` contains phone/emergency contacts — keep that export out of rendered pages. It's in the repo for coach reference only.

---

## Athlete Status Conventions

Status values used in `KNOWN_STATUS` and coach UI:

- `available` — full participation
- `modified` — participating with modifications
- `limited` — reduced training/competition
- `injured` — not competing, recovery track
- `unavailable` — not on team (rare — usually just remove from roster)

---

## Post-Meet Workflow

Every meet follows this pattern:

1. James pastes raw results (MileSplit/Athletic.net unreliable for scraping)
2. Parse all Medford V+JV: place, mark, seed, field size, PR flag
3. Build standalone visual HTML (Highlights / By Athlete / Gaps tabs) — **Squarespace `!important` CSS required**
4. Update `lib/data.js`:
   - Add entry to `RESULTS` array
   - Set `hasResults: true` on the `MEETS` entry
   - Add URL to `RESULTS_URLS`
5. Update `app/page.js` if new exports need importing
6. Push to `main` → Vercel auto-deploys
7. Draft Star News .docx for Matt Frey (Frey style: lead paragraph, coach quotes woven throughout, event-by-event spotlights with seed-vs-actual, results box at end)
8. Draft coach recap email (HTML, CC all staff)

## Meet Entry Workflow

1. James uploads/pastes Athletic.net or pttiming entry PDF
2. Parse all entries by event with seeds
3. **Check WIAA 4-event rule** — flag violations before proceeding
4. Add lineup exports to `data.js` (e.g., `STOUT_BOYS` / `STOUT_GIRLS`)
5. Set `hasLineup: true` on the `MEETS` entry
6. Wire `getLineups()` in `page.js` for the `meetId`
7. Import new exports in `page.js`
8. Flag status changes, missing entries, gaps (relays/events with zero entries)

## Coach Email Format

- HTML with red headers, color-coded results tables (green bg for scoring/PR rows)
- Coach-specific notes broken by group (Greg=distance, Hallie=sprints/hurdles, Dilan=throws, James=jumps/float)
- Athlete status board, gaps to address, upcoming schedule with deadlines/conflicts
- Subject line includes top 3 headline performances
- Wednesday practice: gym arrival 3:30 PM / outdoor start 3:45 PM / hard stop 5:00 PM (religious education)
- CC: Katie Losiewicz `<losieka@medford.k12.wi.us>`, Greg Klapatauskas `<klapagr@medford.k12.wi.us>`, Dilan Schneider `<schnedi@medford.k12.wi.us>`, Hallie Eisfeldt `<Hallie.Eisfeldt@spectruminsgroup.com>`, James Stokes `<jamesgstokes@gmail.com>`

---

## Training Phase System

Used when generating practice plans:

- **SHARPEN** — 0–1 days from next meet (race prep, low volume, high specificity)
- **BUILD** — 2–3 days from meet (moderate volume, quality work)
- **DEVELOP** — 4+ days from meet (higher volume, strength/endurance emphasis)

Split-meet rule: When boys compete and girls don't (or vice versa), the non-competing gender has practice. Eisfeldt leads when boys are at meet; Klapatauskas leads when girls are at meet.

---

## Useful Commands

```bash
# Start dev server
npm run dev

# Build for production (check before pushing if making structural changes)
npm run build

# Verify deploy after push
open https://mash-command-center-zeta.vercel.app

# Quick data.js sanity check
node -e "require('./lib/data.js')"
```

---

## Current Season State Markers

These change frequently — don't assume they're still accurate. Check `MEETS` array in `data.js` for current truth.

- **Most recent completed meet:** Medford Home Invite #2 (meetId 8, 2026-04-23)
- **Upcoming:** GNC Conference (hosted by Rhinelander, ~5/19), WIAA D2 Regional (hosted by Medford, ~5/26), D2 Sectional at Rice Lake (~5/29)
- **Probation watch:** May 7 grade re-check; May 12 eligibility cliff for athletes flagged in `PROBATION` export
- **Season end:** Early June

---

## When In Doubt

1. Read the current `lib/data.js` before making changes — it's the source of truth
2. Validate WIAA 4-event rule on every lineup edit
3. Ask James before making judgment calls on athlete status or lineup changes
4. Commit messages: concise, action-focused (e.g., `feat: Home Invite #2 results`, `fix: Wipf 800m PR update`)
5. Never push directly to `main` with breaking changes — verify `npm run build` passes first
