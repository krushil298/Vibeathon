# IdeaVault — Startup Idea Validator Dashboard

A fullstack web app to submit, browse, and validate startup ideas. Built as part of the Vibeathon hackathon.

## 🚀 Tech Stack
- **Frontend**: Vite + React (TypeScript) + Tailwind CSS
- **Backend / Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (auto-deploy on `git push`)

## ✅ Features
- **Idea Submission** — Submit a startup idea with title, description, problem statement, category, difficulty (1–5), and market potential (Low / Medium / High / Very High).
- **Card Dashboard** — Browse all submitted ideas displayed as rich cards.
- **Filtering** — Filter by category, difficulty level, and market potential.
- **Search** — Keyword search across title, description, and category.
- **Statistics Panel** — See total ideas, most common category, and average difficulty score.
- **Upvoting** — Upvote ideas you like; persisted in the database.
- **Trending Section** — Highlights the top 3 most upvoted ideas.
- **Trending Tab** — Sort all cards by upvote count.
- **Animated Cards** — Smooth fade-in-up transitions on card render.
- **Input Validation** — Prevents empty submissions and duplicate titles.

## 🗄️ Database Schema (Supabase)
```sql
create table startup_ideas (
  id uuid default gen_random_uuid() primary key,
  title text not null unique,
  description text not null,
  problem_statement text not null,
  category text not null,
  difficulty int not null check (difficulty between 1 and 5),
  market_potential text not null check (market_potential in ('Low', 'Medium', 'High', 'Very High')),
  upvotes int default 0 not null,
  created_at timestamp with time zone default timezone('utc', now()) not null
);
```

## 🔧 Running Locally
```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## 📦 Deployment
This project is auto-deployed to Vercel.  
Every `git push` to `main` triggers a new production deployment.
