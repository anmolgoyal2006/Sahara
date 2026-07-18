<div align="center">

<h1>
  <img src="client/public/logo.jpeg" alt="Sahara" width="120" style="vertical-align: middle;" />
  &nbsp;&nbsp;&nbsp;Sahara
</h1>

### Eldercare, Connected

**Sahara connects elderly users, their families, and verified care workers — with an AI voice companion, health tracking, SOS alerts, and family geofencing running underneath.**

A mobile-first platform for India where an elder's health, medicine adherence, service bookings, and emergencies are visible to family in real time, while care workers get a live job queue and location sharing.

[![Live Demo](https://img.shields.io/badge/Live-Demo-16A34A?style=for-the-badge&logo=vercel&logoColor=white)](https://sahara-seven-virid.vercel.app/)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-1E3A8A?style=for-the-badge&logo=github&logoColor=white)](https://github.com/anmolgoyal2006/Sahara)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#-license)

![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)

[Live Demo](https://sahara-seven-virid.vercel.app/) · [Report Bug](https://github.com/anmolgoyal2006/Sahara/issues) · [Request Feature](https://github.com/anmolgoyal2006/Sahara/issues)

</div>

---

### 📚 Table of Contents

[Overview](#-project-overview) · [Why Sahara](#-why-sahara) · [User Roles](#-user-roles) · [Core Features](#-core-features) · [How the AI Companion Works](#-how-the-ai-companion-works) · [Architecture](#️-system-architecture) · [Tech Stack](#️-technology-stack) · [Screenshots](#-screenshots) · [Installation](#️-installation-guide) · [Environment Variables](#-environment-variables) · [Database](#-database) · [API Overview](#-api-overview) · [Folder Structure](#-folder-structure) · [Known Limitations](#-known-limitations) · [Roadmap](#️-future-roadmap) · [Contributors](#-contributors) · [License](#-license)

---

## 📖 Project Overview

Sahara is a mobile-first eldercare platform for India connecting elderly users, their family members, and verified care workers. It layers an AI voice companion (Hindi / English / Romanized Punjabi), health and medicine tracking, SOS alerts, family geofencing, video calls, and a government welfare-scheme eligibility checker on top of a shared Supabase data layer — so an elder's day-to-day status is actually visible to the people around them, not siloed in separate apps.

---

## 💡 Why Sahara?

| Typical Eldercare Tools | Sahara |
|---|---|
| One app for medicine reminders, another for health logs, another for caregiver booking | One platform, one account, all three roles reading from the same data |
| Family finds out about missed doses or low activity after the fact | Real-time medicine adherence and health trend visibility for family |
| Booking a caregiver means a phone call or a separate marketplace app | In-app service booking with worker selection and **live location tracking** |
| Emergency contact is a phone call the elder has to remember to make | One-tap **SOS button** with logged history, visible to family instantly |
| Government welfare schemes are scattered across portals | Built-in **eligibility checker** — a deterministic rules engine, not a guess |
| Health check-ins require typing on a small screen | **Voice input** to the AI companion, in the elder's own language |
| "Is my parent okay right now" has no easy answer | **Geofencing** with family alerts when the elder leaves a safe zone |

---

## 👥 User Roles

Role is chosen once at registration and stored on `users.role`. Login routes accordingly:

1. **Elder** → `/elder/home` — books services, talks to the AI companion, tracks health & medicines, presses SOS, checks scheme eligibility, follows guides, tracks assigned worker
2. **Family** → `/family/dashboard` — monitors a linked elder's health history, location/safe-zone, bookings, and call history (linked via `users.elder_id`)
3. **Worker** → `/worker/jobs` — manages job queue, schedule, live location sharing, ratings, profile

There is no separate admin app.

---

## ✨ Core Features

### 🏛️ Government Scheme Eligibility — the standout feature
A **deterministic rules engine**, not an AI guess: eligibility is computed from age, gender, state, BPL status, Aadhaar, bank details, and income against rules in a static dataset (`data/schemes.json`, built by an offline ingestion script). Gemini's only role is phrasing a one-sentence explanation *after* the status is already decided — benefit amounts are always echoed verbatim, never AI-generated.

### 🎙️ AI Voice Companion
A genuinely LLM-grounded feature. The system prompt is built from the elder's real context — name, age, conditions, latest health log, upcoming bookings, medicines, active alerts — and Gemini responds in Hindi, English, or Romanized Punjabi. The response is parsed for embedded action tags to trigger real bookings, SOS events, or vitals logging, not just chat.

### 🩺 Health & Medicine
- Vitals tracking (BP, sugar, weight, mood) with trend charts
- Medicine reminders with dose tracking and adherence history
- Medical record storage, with Gemini vision used to read uploaded reports

### 🚨 Safety
- One-tap SOS button with logged history
- Geofencing — a deterministic Haversine-distance check against a saved safe-zone radius, with automatic family alerts on breach

### 🤝 Services & Booking
- Service booking (maid, nurse, driver, cook, repair, physiotherapist) with worker selection
- Live worker location tracking during a job
- Post-job ratings and reviews

### 📹 Video Calls
Calls run entirely on **Jitsi Meet** (`meet.jit.si`, no API key required) — the app generates a room name, logs a `video_calls` record, and both sides open the same URL. No custom WebRTC.

### 🔐 Auth
**Google OAuth via Supabase only.** New users are routed through registration; returning users route straight by role.

---

## 🔬 How the AI Companion Works

| Feature | Mechanism | Grounded in real data? |
|---|---|---|
| Scheme eligibility | Deterministic rules engine (age/gender/state/BPL/Aadhaar/bank/income) | Yes — static scheme dataset |
| Scheme explanation text | Gemini phrases one sentence after status is already decided | Yes — never changes the verdict |
| AI companion chat | Gemini, prompted with the elder's live health/booking/medicine context | Yes |
| Companion action triggers | Response parsed for `[ACTION:...]` / `[VITALS:...]` tags → real writes | Yes |
| Medical record reading | Gemini vision reads uploaded report images | Yes |
| Geofencing | Haversine distance formula vs. saved radius | No LLM involved |
| Video calling | Jitsi Meet room generation | No LLM involved |

**Model note:** the codebase currently uses two different model IDs across files — `gemini-3.1-flash-lite` in most routes, and `gemini-2.0-flash` in `medical.js`. Worth reconciling and verifying against the current Gemini API before publishing performance claims.

---

## 🏛️ System Architecture

```
                     ┌────────────────────────┐
                     │   React + Vite Client    │
                     │  (Tailwind, Leaflet,     │
                     │   Recharts)              │
                     └────────────┬────────────┘
                                  │ REST (api.js)
                                  ▼
                     ┌────────────────────────┐
                     │   Node.js + Express API   │
                     │   (server/routes/, active) │
                     └────────────┬────────────┘
                                  │
     ┌──────────────┬─────────────┼─────────────┬──────────────┐
     ▼              ▼             ▼              ▼              ▼
┌──────────┐  ┌──────────┐ ┌──────────┐  ┌────────────┐ ┌────────────┐
│ Supabase  │  │  Google   │ │Cloudinary │  │ Jitsi Meet  │ │  Leaflet    │
│(Postgres, │  │  Gemini   │ │ (uploads, │  │ (video      │ │  (maps,     │
│ Auth, RLS)│  │(companion,│  │ unsigned  │  │  calls, no  │ │  live       │
│           │  │ vision,   │  │ preset)   │  │  API key)   │ │  tracking)  │
│           │  │ scheme    │  │           │  │             │ │             │
│           │  │ copy)     │  │           │  │             │ │             │
└──────────┘  └──────────┘ └──────────┘  └────────────┘ └────────────┘
```

Backend calls use the **service-role Supabase client**, bypassing RLS at the API layer — row-level security policies exist (family-can-view-their-elder) but the Express layer is the actual access boundary in practice.

---

## 🛠️ Technology Stack

<table>
<tr>
<td valign="top" width="33%">

**Frontend**
- React 18.2 + Vite 5.1
- React Router 6.22
- Tailwind CSS 3.4
- Leaflet 1.9 + react-leaflet 4.2
- Recharts 3.9
- Tabler Icons (webfont)

</td>
<td valign="top" width="33%">

**Backend**
- Node.js + Express 4.18
- @supabase/supabase-js 2.38 (service-role)
- CORS, dotenv

</td>
<td valign="top" width="33%">

**AI / External**
- @google/generative-ai 0.24 (Gemini)
- Cloudinary (unsigned upload preset)
- Jitsi Meet (video, no API key)

</td>
</tr>
</table>

**Deploy:** Vercel (client, live at [sahara-seven-virid.vercel.app](https://sahara-seven-virid.vercel.app/)) + Render (server)

---

## 📸 Screenshots

<table>
<tr>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20234328.png" alt="Landing & Google Sign-In" /><br/>
<sub><b>Landing & Google Sign-In</b></sub>
</td>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20234412.png" alt="Elder Home" /><br/>
<sub><b>Elder Home — greeting, health tiles, Sahara code</b></sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20234443.png" alt="Book a Service" /><br/>
<sub><b>Book a Service — speak, type, or tap (Hindi/English/Punjabi)</b></sub>
</td>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20235141.png" alt="AI Companion Chat" /><br/>
<sub><b>AI Companion — grounded chat with action triggers</b></sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20235247.png" alt="Health Log" /><br/>
<sub><b>Health Log — BP, sugar, weight, mood</b></sub>
</td>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20235314.png" alt="Medicines & Adherence" /><br/>
<sub><b>Medicines — weekly adherence & today's schedule</b></sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20235344.png" alt="Medical Records" /><br/>
<sub><b>Medical Records — AI-analysed document vault</b></sub>
</td>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20235405.png" alt="Government Schemes" /><br/>
<sub><b>Government Schemes — eligibility checker & catalogue</b></sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20235432.png" alt="Digital Guide" /><br/>
<sub><b>Digital Guide — learn any app, step by step</b></sub>
</td>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20235518.png" alt="Screenshot Help" /><br/>
<sub><b>Screenshot Help — analyse a screen and get guidance</b></sub>
</td>
</tr>
<tr>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20235729.png" alt="Emergency SOS" /><br/>
<sub><b>Emergency SOS — one tap notifies family</b></sub>
</td>
<td width="50%" align="center">
<img src="Screenshots/Screenshot%202026-07-18%20235913.png" alt="Family Dashboard" /><br/>
<sub><b>Family Dashboard — health, medicines, safety zone</b></sub>
</td>
</tr>
<tr>
<td colspan="2" align="center">
<img src="Screenshots/Screenshot%202026-07-19%20000049.png" alt="Worker Profile" width="50%" /><br/>
<sub><b>Care Worker Profile — skills, languages, verification</b></sub>
</td>
</tr>
</table>

---

## ⚙️ Installation Guide

### Prerequisites
- Node.js v18+
- A Supabase project (Postgres + Auth, Google OAuth provider enabled)
- A Google Gemini API key
- A Cloudinary account (unsigned upload preset)

### 1. Clone the Repository

```bash
git clone https://github.com/anmolgoyal2006/Sahara.git
cd Sahara
```

### 2. Client Setup

```bash
cd client
npm install
npm run dev
```

### 3. Server Setup

```bash
cd server
npm install
npm run dev
```

---

## 🔑 Environment Variables

> ⚠️ **Before publishing this repo:** `client/.env.example` currently contains real values — a live Supabase project URL and anon key, a real Cloudinary cloud name and unsigned upload preset, and production URLs. Replace these with placeholders. (`server/.env.example` is already placeholder-only.)

**Client** (`client/.env`)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
VITE_API_URL=
```

**Server** (`server/.env`)

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
PORT=5000
```

> Double-check the exact variable name your server code reads (e.g. `SUPABASE_SERVICE_ROLE_KEY` vs `SUPABASE_SECRET_KEY`) and keep this block in sync with it — a mismatch here is a common source of "works on my machine" setup bugs for contributors.

---

## 🗄️ Database

The authoritative schema is `client/supabase/schema.sql`.

**Core tables:**
- `users` — id (= `auth.users` id), phone, name, role, language, `elder_id` self-FK linking family → elder
- `elder_profiles` — 1:1 with users; age, conditions, location
- `workers` — 1:1 with users; skills, rating, verified, availability, location
- `bookings` — elder_id, worker_id, service_type, status, rating/review
- `health_logs` — BP, sugar, weight, mood, AI-generated tip
- `medicines` + `medicine_taken_logs` — adherence tracking
- `sos_events` — location, resolved status

**Additional tables** referenced by routes but living in separate migrations rather than the main schema file: `companion_messages`, `geofence_zones`, `geofence_events`, `guides`, `guide_steps`, `guide_progress`, `guide_bookmarks`, `video_calls`, `volunteer_requests`, `notifications`, `medical_records`, `medicine_logs`. See `supabase/*.sql` for these migrations.

Row-Level Security is enabled with family-can-view-their-linked-elder policies.

> ⚠️ There is also a **second, mismatched schema file** at the repo root (`supabase/schema.sql`) describing an unrelated doctor/patient/appointments telemedicine model. It belongs to the abandoned backend below and should be removed to avoid confusing future readers.

---

## 🔌 API Overview

All routes are under `/api`, using the Supabase service-role client:

| Domain | Example Endpoints |
|---|---|
| Auth | `POST /auth/check-user`, `POST /auth/create-user` |
| Companion | `POST /companion/chat`, `POST /companion/greeting`, `GET /companion/history/:elderId` |
| Schemes | `GET /schemes/all\|categories\|search\|:id`, `POST /schemes/check-eligibility` |
| Booking / Worker / Elder / Family | CRUD + live tracking |
| Health / Medicine / Medical / SOS | CRUD + Gemini-generated tips/summaries |
| Geofence | `POST /geofence/zone`, event endpoints |
| Video calls | `POST /create`, `PUT /start/:id`, `PUT /end/:id`, `GET /active/:elderId`, `GET /history/:userId` |
| Guides | CRUD |
| Health check | `GET /api/ping` |

No scheduled jobs or cron tasks run at runtime — the only data collection step is a manual, offline scheme-ingestion script (`server/scripts/ingest-schemes/`).

---

## 📁 Folder Structure

```
Sahara/
├── client/
│   ├── src/
│   │   ├── pages/           # ~40 pages: elder/, family/, worker/, auth
│   │   ├── components/      # booking, companion, elder, family, health, medical,
│   │   │                    # medicine, schemes, sos, videocall, worker, layout
│   │   ├── hooks/           # ~15 hooks: geofence, video call, speech, notifications
│   │   └── lib/             # api.js, supabase.js, speech.js, medicineCategories.js
│   └── supabase/schema.sql  # ✅ the real, active schema
│
├── server/
│   ├── index.js              # entry point — mounts server/routes/ only
│   ├── routes/                # ✅ ACTIVE API (14 route files)
│   ├── lib/gemini.js          # Gemini model configs
│   ├── data/schemes.json
│   ├── scripts/ingest-schemes/  # offline scheme dataset fetch/normalize
│   ├── seed/                  # guide seeder
│   └── src/                   # ⚠️ dead parallel MVC backend — not imported anywhere
│
└── supabase/                  # ⚠️ contains a mismatched, unrelated schema.sql +
                                #    real migrations (geofence tables, booking ratings)
```

---

## 🧪 Known Limitations

Being upfront about the current state of the repo:

- 🔴 **Real secrets in `client/.env.example`** — a live Supabase URL/anon key and Cloudinary cloud name/upload preset are checked in as an "example." Scrub before making the repo public.
- 🔴 **Two competing backends** — `server/routes/` is the live, mounted API; `server/src/` is a complete, unused parallel MVC implementation that nothing imports. Should be deleted or clearly archived.
- 🔴 **Two mismatched database schemas** — the root `supabase/schema.sql` describes an unrelated doctor/patient telemedicine model and doesn't belong to this product; the real schema is `client/supabase/schema.sql`.
- 🟡 **Inconsistent Gemini model IDs** across files (`gemini-3.1-flash-lite` vs `gemini-2.0-flash`) — reconcile and verify against the live Gemini API.
- 🟡 **Dead route**: `server/routes/screenshotHelp.js` imports Gemini vision but is never mounted.
- 🟡 **Vestigial phone/OTP UI** (`PhoneInput`, `OTPInput`, `Verify.jsx`) exists but isn't part of the real login flow, which is Google OAuth only.
- 🟡 **No automated test suite** — only a manual script (`test-schemes.js`) and a dev test page for video calls.
- 🟡 **Schema not consolidated** — tables are spread across `client/supabase/schema.sql`, root-level `supabase/*.sql` migrations, and `server/seed/`.
- 🟡 CORS allow-list on the server references stale Render hostnames that don't match the client's currently configured API URL.

---

## 🗺️ Future Roadmap

- [ ] Remove the dead `server/src/` MVC tree and the mismatched root `supabase/schema.sql`
- [ ] Consolidate the database schema into a single source of truth
- [ ] Reconcile Gemini model IDs across all routes
- [ ] Scrub and rotate the real credentials currently in `client/.env.example`
- [ ] Automated test coverage for booking, SOS, and geofencing flows
- [ ] Remove or wire up the vestigial phone/OTP auth components
- [ ] Push notifications for medicine reminders and SOS events

---

## 🤝 Contributors

| | |
|---|---|
| **Anmol Goyal** | [github.com/anmolgoyal2006](https://github.com/anmolgoyal2006) |
| **Arnav Badal** | — |

Contributions from others are welcome:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add: your feature"`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request with a clear description of the change

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

**Built by [Anmol Goyal](https://github.com/anmolgoyal2006) & Arnav Badal**

🔗 **Repository:** [github.com/anmolgoyal2006/Sahara](https://github.com/anmolgoyal2006/Sahara) · 🌐 **Live:** [sahara-seven-virid.vercel.app](https://sahara-seven-virid.vercel.app/)

If Sahara helped you or inspired your own project, consider giving it a ⭐

</div>