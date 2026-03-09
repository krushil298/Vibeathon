# Product Requirements Document (PRD): VibeLink Shortener

## 1. Overview
VibeLink is a lightning-fast URL shortener built for the Vibeathon Hackathon. It allows users to convert long URLs into quick short links while tracking basic analytics (click counts). The application is optimized for speed, simplicity, and a seamless developer handoff.

## 2. Tech Stack & Architecture
* **Frontend**: React (TypeScript), Vite, Tailwind CSS (v3.4)
* **Backend Database**: Supabase (PostgreSQL)
* **Deployment**: Vercel (Auto-deployed via GitHub Push)
* **Architecture Approach**: 
  Instead of relying on a dedicated Node/Express backend or edge functions to handle redirects, the app implements a blazing-fast "Client-Side SPA Redirect" approach combined with Supabase direct querying. This fulfills the hackathon constraints of maximum speed and minimal boilerplate. 

## 3. Implementation Details

### 3.1 URL Shortening (Core Mechanism)
* A user submits a destination URL.
* Basic validation ensures the URL format is valid (auto-appending `https://` if `http/https` is missing).
* A random 5-character string is generated via base-36 encoding (`Math.random().toString(36).substring(2, 7)`).
* The original URL and short-code are saved to a Supabase table named `links`.

### 3.2 Routing & Redirection 
* To eliminate the need for an external backend or advanced Next.js dynamic routing, the monolithic `App.tsx` handles redirection.
* On initialization `useEffect`, the app inspects `window.location.pathname`.
* If a path exists (e.g., `deployed-url.com/aBc12`), the app enters "Redirect State". It queries Supabase matching the `short_code`, increments the `clicks` counter in the database, and performs an immediate `window.location.href = original_url`.

### 3.3 Click Tracking (Analytics)
* Tracking is done at the point of redirection.
* Before the user is sent to the target URL, the matching database entry is updated: `clicks = current_clicks + 1`.
* The dashboard fetches all existing links ordered by `created_at DESC` and simply reads the `clicks` integer counter, giving real-time tracking data!

### 3.4 Data Persistence
* The `links` table inside Supabase serves as a persistent layer.
* Row Level Security (RLS) is enabled and set up for generic read/write access to facilitate immediate hackathon-speed testing without requiring active User Authentication.

## 4. Requirement Traceability
| Requirement | Implementation Detail | Status |
| ----------- | ----------------------- | ------ |
| **URL Shortening** | Users can submit Long URLs. Appends `https/http` and inserts row into DB | ✅ Done |
| **Redirection** | Reading `window.location.pathname` and fetching `original_url` from DB | ✅ Done |
| **Click Tracking** | Immediate database update upon redirect before routing | ✅ Done |
| **Link Dashboard** | Grid UI mapped over existing links with Original, Shortened, and Clicks data | ✅ Done |
| **Persistence** | Supabase Postgres DB layer retains data across refresh | ✅ Done |
| **Validation** | Utilizes JS `URL` constructor to assert submission is a valid URL, preventing empty. | ✅ Done |

## 5. UI/UX Features
* **Glassmorphism Base Layer**: Implemented using Tailwind backdrop blur and subtle borders via custom hex opacity.
* **Micro-interactions**: Subtle hover state lifting (translate-y), border glows, and spinner interactions.
* **1-Click Copy**: Included a native clipboard API button for instantly copying the shortlink.
