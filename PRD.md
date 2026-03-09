# Product Requirements Document (PRD): VibeLink Management Platform (Round 2)

## 1. Overview
The VibeLink Management Platform extends the VibeLink URL shortener to introduce robust link control and tracking semantics. It now integrates custom user authentication, deep analytics (creation, last accessed timestamps), and physical business logic constraints (expiry limits, disable toggles, and URL mutability).

## 2. Tech Stack & Architecture Updates
* **Authentication**: A custom native Supabase `app_users` table with Row Level Security was created to bypass email-confirmation friction required by default endpoints, allowing instant Registration & Login. Session persistence utilizes `localStorage`.
* **Database Schema Changes**: 
  - `user_id` constraint attached to the Links table for multi-tenant data isolation.
  - `click_limit` (integer, nullable) to evaluate link expiration.
  - `is_active` (boolean) to provide hard-stops for redirecting logic.
  - `last_accessed_at` (timestamp) updated dynamically upon redirection.

## 3. Implemented Features & Logic

### 3.1 Authentication & User Dashboard
* Users are greeted with an adaptive Login/Register gateway UI. 
* Upon authentication, users are redirected to a Dashboard that fetches and mounts _only_ their links via (`.eq('user_id', user.id)`). Logging out clears local state and storage, successfully redirecting to the Home Page gateway.

### 3.2 Link Expiry Limit
* Optional integer input (`clickLimit`) during link creation.
* Redirection interception: If `clicks >= clickLimit`, the router intercepts the request, aborts redirection, and mounts a native React Error UI explaining the Expiry.

### 3.3 Link Enable / Disable
* A toggle-status button inside the dashboard flips the `is_active` boolean on the DB.
* Redirection interception: If `data.is_active` evaluates to false, another specific Error UI intercepts the request.

### 3.4 Destination Evolution (Edit URL)
* An inline UI swap replaces the display destination with a text-input when the "Edit" button is clicked.
* Users can alter the `original_url`. Validation triggers automatically (enforcing protocol prefixes) and updates the DB entry. Subsequent requests immediately redirect to the new target.

### 3.5 Timestamps Processing
* Display fields process the default ISO strings (`created_at` and `last_accessed_at`) into clean localized formats (`toLocaleString()`). If the link hasn't been accessed yet, it gracefully displays "Never".

## 4. Verification Traceability Matrix
| Criteria | Implementation Status |
| -------- | --------------------- |
| 1. Login & Register Work | ✅ Done. Custom `app_users` table handles instant auth and session state. |
| 2. User Dashboard | ✅ Done. Dashboard strictly protects and fetches links by `user_id`. |
| 3. Click Limit Creation | ✅ Done. Optional input box mapped to `click_limit` path-redirection aborts. |
| 4. Enable/Disable Toggle | ✅ Done. 1-click active flipping state visible on cards. |
| 5. Destination Updating | ✅ Done. Inline input overriding existing Database destination mapping. |
| 6. Logout Navigation | ✅ Done. Clears user entity triggering the App router to paint the Home gateway. |
