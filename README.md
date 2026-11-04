# Spoticheck (SpotifyCheck)

A modern full-stack mobile application built to manage shared Spotify Family plan subscriptions, automate cost splitting, track member dues, and send push notifications for upcoming and overdue payments.

Powered by **React Native (Expo SDK 58)** on the frontend and **Supabase (PostgreSQL + Edge Functions)** on the backend.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Repository Structure](#repository-structure)
- [Database Schema & Security](#database-schema--security)
- [Edge Functions & Automated Reminders](#edge-functions--automated-reminders)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (Supabase)](#backend-setup-supabase)
  - [Frontend Setup (Expo)](#frontend-setup-expo)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Contributing & License](#contributing--license)

---

## Overview

Managing a Spotify Family plan often involves messy manual calculations, chasing down co-subscribers for their share, and remembering billing due dates. **Spoticheck** solves this by:

1. Keeping family plan members synced in a centralized dashboard.
2. Generating monthly or periodic billing cycles that split the total subscription cost evenly across active members (including remainder cent rounding).
3. Providing real-time tracking of who has paid and who is overdue.
4. Sending automated push notifications to members prior to the due date, on the due date, and during grace periods.

---

## Key Features

- **Spotify-Inspired Dark Mode UI**: Clean, responsive mobile interface featuring dark tones (`#090D0A`) and Spotify accent green (`#1DB954`).
- **Plan Management**:
  - Configure plan name, subscription cost, currency (supports `GHS`, `NGN`, `KES`, `ZAR`, `USD`, `EUR`, `GBP`), reminder lead days, and grace days.
  - Multi-member support with automated role designation (`owner` vs `member`).
- **Fair Split Billing Cycles**:
  - Create billing cycles for specific date ranges and due dates.
  - Auto-calculates per-member share. Any remainder cents from fractional divisions are distributed fairly.
  - Owner's share is automatically marked as settled upon cycle creation.
- **Payment & Due Tracking**:
  - Detailed status pill indicator for every due: `Paid`, `Unpaid`, or `Overdue`.
  - Record payment methods (Cash, Mobile Money, Bank Transfer, etc.), transaction references, and notes.
- **Automated Push Reminders**:
  - Scheduled Supabase Edge Function sends reminders before due dates, on due dates, and when dues become overdue.
  - Idempotent logging prevents duplicate notifications on the same day.
- **Frictionless Onboarding & Invites**:
  - New members are automatically claimed and matched to their group when registering with their invited email address.
- **Offline Resilience**:
  - TanStack Query with React Native Async Storage persister ensures instant load and offline caching of plan data.

---

## Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│               Mobile Client (iOS & Android)            │
│  React Native (0.88.x) • Expo SDK 58 • Expo Router     │
│  TanStack Query v5 (Persisted) • Expo Notifications   │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / WSS / REST
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Supabase Backend                     │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │   PostgreSQL 15+      │   │ Deno Edge Functions  │  │
│  │  - Row Level Security │   │ - send-reminders     │  │
│  │  - Stored Procedures  │   │   (Expo Push API)    │  │
│  │  - Trigger Functions  │   │                      │  │
│  └───────────────────────┘   └──────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Technologies Used

- **Frontend**:
  - **Framework**: [Expo](https://expo.dev/) (SDK 58) with [React Native](https://reactnative.dev/) (0.88.1) & React 19
  - **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based navigation with typed routes)
  - **State & Caching**: TanStack Query (React Query) v5 + `@tanstack/query-async-storage-persister`
  - **Storage**: `@react-native-async-storage/async-storage` & `expo-secure-store`
  - **Push Notifications**: `expo-notifications`
  - **Icons & Styling**: `@expo/vector-icons` (Ionicons) with a custom design token system
- **Backend**:
  - **Database**: [Supabase](https://supabase.com/) PostgreSQL with Row Level Security (RLS)
  - **Edge Runtime**: Deno / TypeScript for serverless edge functions
  - **Auth**: Supabase Auth (Email OTP / Magic Links)

---

## Repository Structure

```text
spotifyCheck/
├── backend/
│   ├── supabase/
│   │   ├── functions/
│   │   │   └── send-reminders/    # Deno Edge Function for automated push notifications
│   │   │       └── index.ts
│   │   └── migrations/
│   │       └── 20261101000100_init.sql  # Database schema, RLS policies & stored procedures
│   ├── .env.example               # Backend environment variables template
│   └── .env                       # Supabase credentials (git-ignored)
├── frontend/
│   ├── assets/                    # App icons, splash screens, adaptive icons
│   ├── src/
│   │   ├── app/                   # Expo Router file-based route definitions
│   │   │   ├── _layout.tsx        # Root layout, providers & query client
│   │   │   ├── index.tsx          # Initial redirection entry point
│   │   │   ├── (auth)/            # Authentication route group (Sign-in / OTP)
│   │   │   │   ├── _layout.tsx
│   │   │   │   └── sign-in.tsx
│   │   │   ├── (app)/             # Authenticated app route group
│   │   │   │   ├── _layout.tsx    # Plan state guard & viewer resolution
│   │   │   │   ├── setup.tsx      # First-time group creation onboarding
│   │   │   │   ├── (tabs)/        # Main bottom tab navigator
│   │   │   │   │   ├── _layout.tsx
│   │   │   │   │   ├── home.tsx       # Active cycle dashboard & quick actions
│   │   │   │   │   ├── members.tsx    # Family group member roster & invites
│   │   │   │   │   ├── history.tsx    # Historical billing cycles & totals
│   │   │   │   │   └── settings.tsx   # Group settings, currency, grace days, sign out
│   │   │   │   └── cycle/
│   │   │   │       ├── new.tsx        # Create new billing cycle & split dues
│   │   │   │       └── [id].tsx       # Detailed cycle view & member dues management
│   │   │   └── auth/
│   │   │       └── callback.tsx   # Deep link auth handler
│   │   ├── components/            # Reusable UI components (Buttons, Cards, Inputs, Modals)
│   │   ├── hooks/                 # React hooks (useAppData, useMutations, push sync)
│   │   ├── lib/                   # Utilities, Supabase client, formatting, dates, themes
│   │   └── types/                 # TypeScript interfaces and data definitions
│   ├── app.json                   # Expo application configuration & plugins
│   ├── eas.json                   # Expo Application Services (EAS) build config
│   ├── package.json               # Frontend dependencies and scripts
│   ├── tsconfig.json              # TypeScript configuration
│   ├── .env.example               # Frontend environment template
│   └── .env                       # Frontend environment variables (git-ignored)
└── README.md                      # Project documentation
```

---

## Database Schema & Security

The database logic is encapsulated in `backend/supabase/migrations/20261101000100_init.sql`.

### Core Tables

| Table | Description |
| :--- | :--- |
| `profiles` | Extended user profile information tied to Supabase `auth.users`. |
| `groups` | Represents a Spotify Family subscription group (currency, plan cost, grace days, etc.). |
| `group_members` | Members belonging to a group, tracking their role (`owner` \| `member`) and status (`active` \| `removed`). |
| `invites` | Pending group invitations associated with emails. |
| `billing_cycles` | Specific subscription periods (start date, end date, due date, total cost, share cost). |
| `dues` | Individual payment shares per member per billing cycle, recording payment method, notes, and timestamps. |
| `push_tokens` | Device Expo push tokens for push notification delivery. |
| `reminder_log` | Deduplication log to track sent reminders (`before`, `due`, `overdue`) per due. |

### Stored Procedures (Security Definer RPCs)

All write operations with multi-table consistency are wrapped in PostgreSQL functions:
- `create_group(...)`: Provisions a new group and creates the owner profile and member record.
- `add_group_member(...)`: Adds an invited member to an existing group.
- `create_billing_cycle(...)`: Validates parameters, splits the total sum across active members, distributes remainder cents, and auto-settles the owner's share.
- `record_payment(...)`: Records or reverts a member's payment with optional payment method, reference, and note.
- `accept_invites()`: Auto-associates an authenticated user with pending memberships based on their email.

### Row Level Security (RLS)

Strict RLS policies ensure:
- Members can only view groups and billing cycles they belong to.
- Group owners retain full administrative access to edit plan parameters and manage cycles.
- Non-owner members can only view their own due payments.

---

## Edge Functions & Automated Reminders

The backend includes a serverless Deno Edge Function located at `backend/supabase/functions/send-reminders/index.ts`:

- **Function**: Scans all open billing cycles and unfulfilled dues.
- **Notification Types**:
  - `before`: Sent `reminder_days_before` prior to the due date.
  - `due`: Sent on the exact due date.
  - `overdue`: Sent during grace days or after the due date.
- **Delivery**: Dispatches messages to the [Expo Push Notification Service](https://docs.expo.dev/push-notifications/overview/).
- **Security**: Can be invoked via scheduled cron jobs protected by the `REMINDER_CRON_SECRET` header (`x-reminder-secret`).

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or later)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional for local development, or a free [Supabase](https://supabase.com) project)
- [Expo Go](https://expo.dev/go) app on your mobile device, or an iOS / Android simulator

---

### Backend Setup (Supabase)

1. **Create or Link a Supabase Project**:
   Create a new project on [Supabase](https://supabase.com/).

2. **Apply Database Migration**:
   In your Supabase project dashboard, navigate to the **SQL Editor**, paste the contents of `backend/supabase/migrations/20261101000100_init.sql`, and execute it.
   *(Alternatively, use `supabase db push` if using the Supabase CLI).*

3. **Deploy the Edge Function**:
   ```bash
   cd backend
   supabase functions deploy send-reminders --no-verify-jwt
   supabase secrets set SUPABASE_URL="https://<your-project>.supabase.co" \
     SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>" \
     REMINDER_CRON_SECRET="<your-custom-secret>"
   ```

4. **Configure Scheduled Cron**:
   Set up `pg_cron` or an external scheduler (e.g. GitHub Actions, cron-job.org) to hit the function daily:
   ```bash
   POST https://<your-project>.supabase.co/functions/v1/send-reminders
   Header: x-reminder-secret: <your-custom-secret>
   ```

---

### Frontend Setup (Expo)

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase project URL and anon public key in `frontend/.env`:
   ```ini
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

4. **Start the Development Server**:
   ```bash
   npm run start
   ```

5. **Run on Device or Emulator**:
   - Press `a` in the terminal to run on Android emulator.
   - Press `i` to run on iOS simulator.
   - Press `w` to run in the web browser.
   - Or scan the QR code using the **Expo Go** app on your physical device.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
| :--- | :--- |
| `SUPABASE_URL` | The HTTPS URL of your Supabase project instance. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role secret key (bypasses RLS for admin tasks and edge functions). |
| `REMINDER_CRON_SECRET` | Secret key used to verify cron trigger requests. |

### Frontend (`frontend/.env`)

| Variable | Description |
| :--- | :--- |
| `EXPO_PUBLIC_SUPABASE_URL` | Public HTTPS endpoint for your Supabase backend. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous API key for authenticating client requests. |

---

## Available Scripts

In the `frontend/` directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run start` | Starts the Expo dev server with interactive terminal options. |
| `npm run android` | Starts the dev server and attempts to launch Android emulator. |
| `npm run ios` | Starts the dev server and attempts to launch iOS simulator. |
| `npm run web` | Launches the app in a web browser. |
| `npm run typecheck` | Runs the TypeScript compiler (`tsc --noEmit`) to verify types. |
| `npm run lint` | Runs ESLint (`expo lint`) to identify code quality issues. |
| `npm run prebuild` | Generates native `ios` and `android` directories using Expo Prebuild. |
| `npm run build:apk` | Triggers an EAS preview build for Android APK. |

---

## Contributing & License

Contributions, bug reports, and suggestions are welcome! Please open an issue or submit a pull request.

This project is licensed under the MIT License.

