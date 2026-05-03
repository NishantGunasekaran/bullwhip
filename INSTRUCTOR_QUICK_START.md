# Instructor quick start — Bullwhip (Beer Game)

**What it is.** A browser-based **four-role supply chain simulation** (retailer → wholesaler → distributor → factory). Students place weekly orders under delays and costs; you debrief on **inventory, backlog, orders, and total system cost** (bullwhip effect).

**Before you run a class.** Open the app URL. On the welcome screen, set **Demand & AI** (used for solo practice and for **tournaments you create**). Students who **join** someone else’s session use **your** session/tournament settings, not their own.

---

## Option A — One cohort, four humans (single session)

1. **Create session** → enter your name → **Create session**.
2. **Share the 6-digit code** with exactly four players (e.g. slide, LMS, chat).
3. Each player: **Join session** → name + code → they get a **role at random** (not shown to others during play).
4. You stay as **instructor** (no role): you see progress and **start** when ready; you may **submit for AI/ghost** roles if your setup uses ghosts.
5. Each **week**: every player enters an **order** and **submits**; the chain advances when orders are in. **20 weeks** complete one run.
6. **Debrief:** use totals, charts, and **export** if available. Roles can be revealed after discussion.

*Tip:* Run through **Solo play** once yourself so you know the flow.

---

## Option B — Multiple teams (tournament)

1. **Create tournament** → choose **number of teams** (each team = up to 4 players). Demand/AI are the **same for every team** (from **Demand & AI** above).
2. Share the **tournament code**. Players: **Join tournament** → name + code → auto-assigned **team and role**.
3. Optional: as creator, you can set **team names** before start (saved per team).
4. **Start tournament** when ready. Empty seats become **AI** players for that team.
5. After play: **tournament results** compare teams (same demand curve); use **analytics / CSV** per team if offered.

---

## During play (what to say)

- Each week: **receive** → see **demand or incoming orders** → **ship** what you can → **place order** upstream.
- **Lead times:** 2 weeks for shipments and for orders (as shown in-app).
- **Goal:** lower **total system cost** over 20 weeks (holding + backlog), not “winning” one role.

---

## If something goes wrong

| Issue | What to try |
|--------|-------------|
| White screen / “missing tournament” | Refresh; confirm **Supabase** is configured and **migrations** applied for your project. |
| Team name won’t save | Database needs `sessions.team_label` column (migration); check **RLS** allows updates. |
| Stuck between weeks | Ensure all four roles (or ghosts) have **submitted** for that week. |

---

## Support line for your syllabus

> *“Use Chrome or Edge; one device per player. Have the 6-digit code ready before class. Instructor creates the session or tournament; do not use ‘Create’ if you are only joining.”*

---

*Document version: matches in-app flows (Create session, Join session, Create / Join tournament). Point students to the same URL you use.*
