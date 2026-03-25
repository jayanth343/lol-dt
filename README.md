# ⚡ LOL Sports League — CTO DT Season 2

Full-stack sports league management platform with **live scoring** (ball-by-ball for cricket, goals for football, points for badminton/TT/carrom), **multi-role authentication** (Admin / Team Owner / Viewer), and real-time updates via **Socket.io**.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6 |
| Backend | Node.js, Express |
| Real-time | Socket.io (live scoring, auction) |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcrypt |


---

## 🔴 Enable Real-time DB Sync (Change Streams — Replica Set)

MongoDB Change Streams require MongoDB to run as a **Replica Set**. This is a one-time setup and takes about 2 minutes.

### Option A — Local MongoDB (Development)

**1. Stop any running `mongod` instance first.**

**2. Create a data directory for the replica set:**
```bash
mkdir -p ~/data/rs0
```

**3. Start MongoDB with replica set mode:**
```bash
mongod --replSet rs0 --dbpath ~/data/rs0 --port 27017
```

**4. In a new terminal, initialise the replica set (one time only):**
```bash
mongosh
> rs.initiate()
> exit
```

**5. Update your `.env`:**
```
MONGO_URI=mongodb://localhost:27017/lol_league?replicaSet=rs0
```

**6. Start the app normally:**
```bash
npm run dev
```
You should see in server logs:
```
✅ MongoDB connected
👁  Change stream watching: matches
👁  Change stream watching: players
👁  Change stream watching: standings
👁  Change stream watching: teams
✅ MongoDB Change Streams initialised
```

### Option B — MongoDB Atlas (Cloud, Recommended for Production)
Atlas runs as a Replica Set by default — no configuration needed. Just paste your Atlas connection string into `.env`:
```
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/lol_league
```

### What real-time DB sync gives you
| What changes | Who sees it instantly |
|---|---|
| Admin updates a match score via REST/Admin panel | All viewers on Matches, MatchDetail, Home |
| Player sold in auction | Players page, Home sidebar, Auction page |
| Standings recalculated after match | Standings page, Home points table |
| Team budget deducted | Auction budget bars |
| New match created by admin | Home & Matches page auto-update |
| Any direct DB edit (even via MongoDB Compass) | Pushes to all connected clients |

---

## 🚀 Quick Start (3 steps)

### Step 1 — Install MongoDB
Download and install from: https://www.mongodb.com/try/download/community

Start MongoDB:
```bash
# macOS / Linux
mongod

# Windows
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
```

### Step 2 — Install dependencies & seed data
```bash
# From the root folder (lol-sports-league/)
npm run install:all     # installs both server and client deps

npm run seed            # seeds database with 8 teams, 14 players, 9 matches
npm run backfill:sport-details   # backfills sport metadata into existing tournaments/matches
```

Seed output shows login credentials:
```
admin@lol.com    / admin123    ← Full admin access
owner1@lol.com   / owner123   ← Thunder XI team owner
owner2@lol.com   / owner123   ← Blue Hawks team owner
viewer@lol.com   / viewer123  ← View only
```

### Step 3 — Run the app
```bash
npm run dev     # starts server (port 5000) + React client (port 3000)
```

Open: **http://localhost:3000**

---

## 📁 Project Structure

```
lol-sports-league/
├── server/
│   ├── index.js              ← Express + Socket.io entry point
│   ├── seed.js               ← Database seeder (run once)
│   ├── models/
│   │   ├── User.js           ← Multi-role auth (admin/team_owner/viewer)
│   │   ├── Team.js           ← 8 teams with budgets
│   │   ├── Player.js         ← Players with sports, skill, auction data
│   │   ├── Match.js          ← Live scoring (cricket/football/badminton/TT/carrom)
│   │   ├── Standing.js       ← Per-sport leaderboard (auto-updated)
│   │   └── Auction.js        ← Auction sessions and bids
│   ├── routes/
│   │   ├── auth.js           ← Login, register, /me
│   │   ├── teams.js          ← CRUD teams
│   │   ├── players.js        ← Player management + registration
│   │   ├── matches.js        ← Schedule + results + standings auto-update
│   │   ├── standings.js      ← Per-sport leaderboard
│   │   └── auction.js        ← Live auction state + bidding
│   ├── socket/
│   │   └── index.js          ← Real-time: cricket ball-by-ball, football goals,
│   │                           badminton/TT/carrom points, match status
│   └── middleware/
│       └── auth.js           ← JWT auth + role guards
├── client/
│   └── src/
│       ├── App.js            ← Router + protected routes
│       ├── context/AuthContext.js   ← Auth state (JWT)
│       ├── lib/api.js        ← All API calls + Socket.io client
│       ├── components/
│       │   ├── Shared.js     ← Navbar, MatchRow, TeamLogo, AuthModal
│       │   └── ScorerPanel.js← Live scorer for admin/owner (per sport)
│       └── pages/
│           ├── Home.js       ← Dashboard + live match ticker
│           ├── Matches.js    ← Full schedule with filters
│           ├── MatchDetail.js← Cricbuzz-style live scorecard
│           ├── Standings.js  ← 5-sport points tables
│           ├── Teams.js      ← Team cards + squad detail
│           ├── Players.js    ← Player directory + detail panel
│           ├── Auction.js    ← Live auction with real-time bidding
│           ├── Register.js   ← Player registration form
│           └── Admin.js      ← Admin panel (schedule, update scores, manage)
├── .env                      ← Config (MongoDB URI, JWT secret)
└── package.json              ← Root: runs both server + client
```

---

## 🎮 User Roles

| Role | Can Do |
|---|---|
| **Admin** | Everything: schedule matches, update scores, run auction, manage all data |
| **Team Owner** | Place bids in auction, update live scores for their matches |
| **Viewer** | Watch live scores, view standings, register as a player |

---

## 📡 Real-time Features (Socket.io)

All viewers see these update **instantly without refreshing**:

| Event | Who sends | Who receives |
|---|---|---|
| Cricket ball (runs/wicket/wide) | Admin/Scorer | All match viewers |
| Football goal | Admin/Scorer | All match viewers |
| Badminton/TT point | Admin/Scorer | All match viewers |
| Match status (live/completed) | Admin | All viewers |
| Auction bid | Team Owner | All auction viewers |
| Standings update | Auto on match result | All standings viewers |

---

## 🏏 Live Scoring Guide

1. Open any live match → click the match card
2. **Admin/Team Owner**: Scorer Panel appears on the right
3. **Cricket**: Click `0`, `1`, `2`, `4`, `6`, `Wide`, `Wicket` for each ball
4. **Football**: Enter player name + minute → click team's goal button
5. **Badminton/TT/Carrom**: Click `+1 THX` or `+1 BLH` for each point

Every click instantly updates all connected viewers.

---

## 🗄️ MongoDB Collections

- `users` — auth, roles, team assignments
- `teams` — 8 teams with budgets
- `players` — roster, sports, auction status
- `matches` — schedule, live data (cricketLive, footballLive, pointsLive), scoreEvents[]
- `standings` — per-sport leaderboard, auto-updated on match completion
- `auctions` — live auction session state

---

## 🔧 Environment Variables (.env)

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/lol_league
JWT_SECRET=your_secret_here
CLIENT_URL=http://localhost:3000
```

---

## 📊 Evaluation Coverage

| Criteria | Implementation |
|---|---|
| Problem Understanding (20) | All 6 manual processes automated: registration, teams, bidding, scheduling, scoring, leaderboard |
| System Design (20) | MongoDB + Express REST API + Socket.io, JWT auth, role-based access |
| UI/UX & Innovation (20) | Cricbuzz-style live scorecard, real-time ball-by-ball, sport filters, countdown |
| MVP Implementation (20) | Fully working: all pages, live scoring, auction, multi-role auth |
| Presentation (20) | Complete README, seed script, architecture, demo accounts |

---

## ✨ Season 2 Upgrades (Hackathon Build)

### Bug Fixes
| # | File | Fix |
|---|---|---|
| 1 | `client/src/pages/Admin.js` | Fixed crash: `TeamLogo`/`Loader` → `TL`/`Ldr` |
| 2 | `client/src/App.js` | Fixed route guard: `/admin` required `admin` role not `owner` |
| 3 | `server/routes/standings.js` | Removed duplicate `module.exports` |
| 4 | `client/src/pages/Auction.js` | Fixed stale player queue on `active` status |
| 5 | `server/socket/index.js` | Fixed innings 2: score assignment was swapped |
| 6 | `server/socket/index.js` | Fixed innings 2 ball-by-ball: always updated team1Score even when team2 was batting |

### New Features

#### 🔨 Auction — Live Bidding Experience
- **30-second countdown ring** — SVG ring turns green → orange → red; each bid resets the clock
- **Cinematic player card reveal** — smooth slide-up + scale animation on every new player
- **Bid war pulse** — gold glow ripples on avatar & bid display when a new bid lands
- **Danger mode** — entire spotlight border turns red under 10 seconds
- **"LEADING" badge** — budget panel highlights whichever team has the live top bid

#### 📈 MatchDetail — Cricbuzz-style Live Scoring
- **Run Worm chart** — canvas line chart showing over-by-over run progression for both teams
- **Over-by-over breakdown** — last 6 overs with color-coded ball circles (W=red, 6=gold, 4=green)
- **🎙️ Auto commentary** — templated commentary lines generated from ball events (wickets, fours, sixes)
- **📤 WhatsApp share card** — formatted match result card with one-tap share/copy for WhatsApp

#### ⭐ Fantasy Leaderboard (New page: `/fantasy`)
- Auto-calculates fantasy points from live match events: runs, fours, sixes, wickets, goals, set wins, match wins
- Animated podium for top 3 with sport-color avatars
- Expandable rows showing per-player point breakdown
- Filter by sport; links from Home page Quick Actions

#### 🏠 Home — Live Data
- Season stats now pull from live DB (players, teams, match count)
- Top Performers section uses real auction data (highest-bid players)
- Quick Actions includes Fantasy leaderboard link

#### 🔌 Server Improvements
- `GET /api/matches/fantasy` — dedicated endpoint returning completed matches with full score events
- `standings:update` socket event now fires when a match completes (both via REST and socket)
