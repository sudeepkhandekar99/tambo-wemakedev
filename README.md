
# AI Planner – Tambo Hackathon

An AI-first calendar where you **talk to your schedule** instead of managing it manually.

Built using **Tambo + GPT-5**, this planner understands your goals, constraints, and availability, then creates calendar events automatically.

---

## What it does

Instead of dragging events around, you just tell the AI:

- “Plan my day”
- “Schedule a study session tomorrow”
- “Create a training plan”
- “Make a plan from this syllabus”

The AI:

- Reads your calendar
- Understands your goals
- Avoids conflicts
- Creates events automatically

---

## Core Features

### 1. AI Chat Planner (Tambo)
- Chat-based planning interface
- AI has full calendar context
- Uses Tambo tools to:
  - Create events
  - Update events
  - Delete events
  - Read schedule

---

### 2. Goals + Time Blocks
Users can define:

- Personal goals (sleep early, wake at 5 AM, etc.)
- Fixed time blocks (classes, work, gym, focus hours)

The AI automatically plans around these constraints.

---

### 3. Study Plans from Images
- Upload syllabus or notes
- AI reads the image
- Generates a study plan
- Schedules sessions automatically

---

### 4. Full Calendar System
- Day / Week / Month views
- Create, edit, delete events
- AI and manual events supported

---

### 5. Import Existing Calendar
- Import `.ics` files
- Bring your real schedule into the app
- AI adapts to your availability instantly

---

## Tech Stack

**Frontend**
- Next.js
- React
- Tailwind + shadcn/ui
- React Big Calendar

**Backend**
- Supabase (Auth + Database)

**AI Layer**
- Tambo
- GPT-5
- Tambo tools + context helpers

---

## How Tambo is used

### Context helpers
Injected into every message:

- Selected date
- Daily schedule
- Goals
- Time blocks

### Tools
- `get_schedule`
- `create_events`
- `update_event`
- `delete_event`

This allows the AI to **directly manage the calendar**.

---

## Local Setup

### 1) Clone the repo

```bash
git clone <your-repo-url>
```
### 2) Install dependencies
```bash
npm install
```
### 3) Add env vars
Create a file named .env.local at the project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_TAMBO_API_KEY=your_tambo_api_key
```
### 4) Run the app
```bash
npm run dev
```
---
## Required Supabase Tables

### events
| column     | type         | notes                          |
|------------|--------------|--------------------------------|
| id         | uuid (pk)    | primary key                    |
| user_id    | uuid         | references auth.users(id)      |
| title      | text         | event title                    |
| start_ts   | timestamptz  | event start time (UTC)         |
| end_ts     | timestamptz  | event end time (UTC)           |
| memo       | text         | optional notes                 |
| source     | text         | "manual" or "ai"               |
| created_at | timestamptz  | default now()                  |

---

### user_goals
| column     | type         | notes                          |
|------------|--------------|--------------------------------|
| id         | uuid (pk)    | primary key                    |
| user_id    | uuid         | references auth.users(id)      |
| label      | text         | goal text (e.g. “Sleep by 10”) |
| is_active  | boolean      | goal enabled/disabled          |
| created_at | timestamptz  | default now()                  |

---

### time_blocks
| column     | type         | notes                                   |
|------------|--------------|-----------------------------------------|
| id         | uuid (pk)    | primary key                             |
| user_id    | uuid         | references auth.users(id)               |
| label      | text         | e.g. “Classes”, “No meetings”           |
| days       | int[]        | array of weekdays (0=Sun … 6=Sat)       |
| start_time | text         | "HH:MM" local time                      |
| end_time   | text         | "HH:MM" local time                      |
| created_at | timestamptz  | default now()                           |
---

## Roadmap / TODO

### Billing + Token System
- Stripe subscription integration
- Token-based usage model
- Live token balance in UI
- Token burn per AI action

### Chat Improvements
- Merge chat threads
- Versioned plans per day
- Restore previous AI plans
- Better plan preview before applying

### Calendar Integrations
- Direct Google Calendar sync (OAuth)
- Two-way sync with external calendars

---

## Author

**Sudeep**  
Built for the Tambo Hackathon.