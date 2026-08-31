<div align="center">
  <img src="public/favicon.jpg" width="100" height="100" alt="InterviewMaster AI Logo" style="border-radius: 20px;" />
  <h1>InterviewMaster AI</h1>
  <p><strong>AI-powered technical interview preparation platform</strong></p>

  [![Build & Deploy](https://github.com/SatyaTejaChukka/interviewmaster/actions/workflows/deploy.yml/badge.svg)](https://github.com/SatyaTejaChukka/interviewmaster/actions/workflows/deploy.yml)
  [![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://interviewmaster-ai.vercel.app)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
</div>

---

## ✨ Features

- 🤖 **AI-Generated Questions** — Scenario-based technical questions across multiple difficulty levels (Beginner / Intermediate / Advanced)
- 🎯 **Real-Time Validation** — Instant AI feedback on your answers with constructive hints
- 📊 **Performance Dashboard** — Track scores and topic performance over time with beautiful charts
- 💬 **AI Interview Coach** — Chat with a coaching persona (DSA Expert, Cloud Architect, or Balanced Coach) for open-ended practice
- 🌐 **Multi-Provider AI** — Supports 6 AI providers: Google Gemini, NVIDIA, Groq, Claude, Mistral, OpenRouter
- 🌙 **Dark / Light Mode** — Smooth ripple transition between themes
- 🔒 **Privacy First** — All data stored locally (localStorage). No server. No tracking.

## 🏗 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Bundler | Vite 6 |
| Routing | React Router v7 |
| Charts | Recharts |
| Icons | Lucide React |
| AI SDKs | @google/genai, fetch (for NVIDIA, Groq, Claude, Mistral, OpenRouter) |
| Deployment | Vercel |

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- An API key from at least one supported AI provider

### 1. Clone & Install
```bash
git clone https://github.com/SatyaTejaChukka/interviewmaster.git
cd interviewmaster
npm install
```

### 2. Configure API Keys (optional for local dev)
Copy the example env file and add your keys:
```bash
cp .env.example .env.local
```
Edit `.env.local`:
```env
VITE_GEMINI_API_KEY=your-key-here
VITE_NVIDIA_API_KEY=your-key-here
# etc.
```
> **Alternatively**, skip this step and add your API keys directly from the **Profile → API Keys** section after logging in. The app is fully BYOK (Bring Your Own Key).

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production
```bash
npm run build
npm run preview   # preview the production build locally
```

## 🔑 API Key Providers

| Provider | Free Tier | Get Key |
|---|---|---|
| Google Gemini | ✅ Yes | [ai.google.dev](https://ai.google.dev/gemini-api/docs/api-key) |
| Groq | ✅ Yes | [console.groq.com](https://console.groq.com) |
| NVIDIA | ✅ Trial | [build.nvidia.com](https://build.nvidia.com) |
| Mistral | 💳 Paid | [console.mistral.ai](https://console.mistral.ai) |
| Claude (Anthropic) | 💳 Paid | [console.anthropic.com](https://console.anthropic.com) |
| OpenRouter | ✅ Credits | [openrouter.ai](https://openrouter.ai) |

## ☁️ Deploy to Vercel

### Option 1: One-Click (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SatyaTejaChukka/interviewmaster)

### Option 2: Manual CLI
```bash
npm i -g vercel
vercel --prod
```

### Option 3: GitHub Actions CI/CD
The repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys on push to `main`.

Add these 3 secrets to your GitHub repository (**Settings → Secrets → Actions**):

| Secret | How to get it |
|---|---|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Run `vercel whoami` then check project settings |
| `VERCEL_PROJECT_ID` | Run `vercel link` in the project root |

> No API key secrets needed — users configure their own keys via the Profile page.

## 📁 Project Structure

```
interviewmaster/
├── components/
│   ├── ErrorBoundary.tsx   # Global error recovery UI
│   ├── Layout.tsx          # App shell with navigation
│   └── UsageDashboard.tsx  # AI provider usage metrics
├── pages/
│   ├── Auth.tsx            # Login / guest mode
│   ├── Dashboard.tsx       # Performance overview
│   ├── InterviewSession.tsx # Core interview flow
│   ├── ChatAssistant.tsx   # AI coaching chat
│   └── Profile.tsx         # Settings & API key management
├── services/
│   ├── gemini.ts           # Interview logic (questions, validation, reports)
│   ├── llmProvider.ts      # Multi-provider AI abstraction layer
│   └── storage.ts          # LocalStorage persistence
├── public/
│   └── favicon.jpg
├── vercel.json             # Vercel SPA config + security headers
├── vite.config.ts          # Build config with code splitting
└── types.ts                # TypeScript type definitions
```

## 📄 License

MIT © InterviewMaster AI
