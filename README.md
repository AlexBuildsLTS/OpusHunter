<div align="center">
  <img src="assets/icon.png" width="120" alt="OpusHunter Logo" />
  <h1>OpusHunter 🎯</h1>
  <p><strong>Autonomous Job Hunting & AI Application Engine</strong></p>
  <p>
    OpusHunter is a cross-platform, automated job application engine and secure document vault built with React Native (Expo), Supabase, and Google Gemini AI. It runs seamlessly on iOS, Android, and Web, combining sleek glassmorphic UI with cutting-edge backend automation to find jobs, score them against your profile, and generate highly personalized cover letters instantly.
  </p>
</div>

---

## ✨ Features

- **🌐 Cross-Platform Excellence**: A truly adaptive UI. Desktop web users get a beautiful hovering transparent sidebar, while mobile users get an immersive, rounded floating bottom tab bar with haptic feedback.
- **🤖 Automated Job Scraping**: Define your rules (Keywords, Locations, Experience Levels) and the OpusHunter Edge Engine will continuously scour the internet for matching jobs.
- **🧠 Gemini AI Intelligence**: Scraped jobs are passed to Google Gemini 3.1 Flash, which reads the job description and your Base CV, scores the match (0-100%), and flags key skills.
- **⚡ 1-Click Cover Letters**: Generate hyper-personalized, context-aware cover letters for any job in your pipeline with a single tap using Gemini.
- **🔒 Secure Vault**: Upload your Base CV and certifications to a highly secure Supabase Storage bucket protected by Row Level Security (RLS).
- **🔑 Bring Your Own Key (BYOK)**: Supports both global admin API keys and individual user API keys for RapidAPI and Gemini.

---

## 🏗 Architecture & Tech Stack

OpusHunter is built for speed, security, and aesthetics.

- **Frontend**: React Native, Expo Router, NativeWind (Tailwind CSS v4)
- **State Management**: React Query (data fetching), Zustand (global state)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI Processing**: Google Gemini API (`gemini-3.1-flash`)
- **Animations**: `react-native-reanimated`, Lucide React Native icons

---

## ⚙️ How the Engine Works

The core of OpusHunter relies on **Supabase Edge Functions** to execute jobs securely in the cloud.

### 1. The Scraping Pipeline
Users configure their "Rules" in the Configure tab. The Edge Engine uses **RapidAPI** to fetch real-time job listings from global job boards (LinkedIn, Indeed, Glassdoor). The scraper automatically deduplicates jobs and inserts them into your pipeline.

### 2. The AI Matchmaker
Once a new job enters the pipeline, the `generate-cover-letter` Edge Function pulls the user's Base CV from the Vault and the job description. Gemini evaluates the semantic overlap, scoring the job and highlighting missing skills.

### 3. Application Execution
When the user reviews a job in their Dashboard, they can tap "Generate Cover Letter". Gemini instantly writes a highly tailored response, which the user can copy or export to apply.

---

## 🔑 API Integration Guide

To run OpusHunter, you need two API keys. These can be configured globally in your Supabase project `.env` file, or users can add their own personal keys in the app (`Settings > API Keys`).

### 1. RapidAPI (Job Scraping)
OpusHunter currently uses the **JSearch API** on RapidAPI to aggregate jobs.
- **How to get it**: Register at [RapidAPI JSearch](https://rapidapi.com/letscrape-6bRBa3QG1q/api/jsearch) and subscribe to the basic tier.
- **Extensibility & Free Alternatives**: You can easily modify the Edge Functions to use other free/cheap APIs. Great alternatives to implement include:
  - **Adzuna API** (Great free tier for UK/US jobs)
  - **Jooble API**
  - **The Muse API**
  - **Reed API**

### 2. Google Gemini (AI Intelligence)
Used for the heavy semantic processing, matching, and cover letter writing.
- **How to get it**: Generate a free API key at [Google AI Studio](https://aistudio.google.com/).
- **Why Gemini?**: We use `gemini 3.1 flash` because of its massive context window (perfect for reading long CVs and Job Descriptions simultaneously) and blazing fast response times.

---

## 🔑 API Integration Guide

To run OpusHunter, you need two API keys. These can be configured globally in your Supabase project `.env` file, or users can add their own personal keys in the app (`Settings > API Keys`).

### 1. RapidAPI (Job Scraping)
OpusHunter currently uses the **JSearch API** on RapidAPI to aggregate jobs.
- **How to get it**: Register at [RapidAPI JSearch](https://rapidapi.com/letscrape-6bRBa3QG1q/api/jsearch) and subscribe to the basic tier.
- **Extensibility & Free Alternatives**: You can easily modify the Edge Functions to use other free/cheap APIs. Great alternatives to implement include:
  - **Adzuna API** (Great free tier for UK/US jobs)
  - **Jooble API**
  - **The Muse API**
  - **Reed API**

### 2. Google Gemini (AI Intelligence)
Used for the heavy semantic processing, matching, and cover letter writing.
- **How to get it**: Generate a free API key at [Google AI Studio](https://aistudio.google.com/).
- **Why Gemini?**: We use `gemini 3.1 flash` because of its massive context window (perfect for reading long CVs and Job Descriptions simultaneously) and blazing fast response times.


---

## 🛠 Future Improvements & Roadmap

OpusHunter is powerful, but there is always room to grow. Here are the planned improvements for contributors:

1. **Auto-Apply Scripts**: Implement a Puppeteer or Playwright engine inside a Docker container (or via specialized APIs) to automatically click "Easy Apply" on LinkedIn and submit the AI-generated cover letter without user intervention.
2. **Multi-CV Support**: Allow users to upload multiple base CVs (e.g., one for Frontend, one for Backend) and have the AI dynamically select the best one to use for each job.
3. **Analytics Dashboard**: Add a beautiful chart view tracking jobs scraped, applications sent, and interview conversion rates

---

<div align="center">
  <i>Engineered for the future of work. Stop hunting. Let OpusHunter do it for you.</i>
</div>
