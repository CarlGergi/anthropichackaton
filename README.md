# Finora - AI Budget Assistant for Students 💜

> Voice-first AI financial assistant powered by Claude Sonnet 4. Talk to your budget like you're texting a friend.

**Built for the Anthropic Hackathon**

---

## Overview

Finora is a conversational budget app that uses voice AI to help students manage their money. Instead of forms and spreadsheets, you have natural conversations with an AI assistant that tracks expenses, gives advice, and suggests affordable options when you're running low.

### Key Features

- **Voice Conversations** - Talk naturally using Web Speech API and ElevenLabs TTS
- **Claude AI Integration** - Intelligent budget advice and intent recognition
- **Smart Recommendations** - Get affordable venue suggestions when money is tight
- **Expense Tracking** - Voice or manual transaction logging with categories
- **Spending Analysis** - Claude analyzes patterns and provides insights
- **Achievements** - Gamification to keep budgeting engaging
- **Real-time Visualizations** - Animated character with Framer Motion
- **Keyboard Shortcuts** - Quick access to all features

---

## Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- Framer Motion

**Backend & AI**
- Claude Sonnet 4 (Anthropic)
- Supabase Edge Functions (Deno)
- ElevenLabs TTS API (free tier: 10,000 chars/month)
- Web Speech API

**State Management**
- LocalStorage (privacy-first, no backend database)
- React hooks for UI state

---

## Project Structure

```
anthropichackaton/
├── src/
│   ├── ai/
│   │   └── claude.ts              # Claude API integration
│   ├── voice/
│   │   ├── stt.ts                 # Speech-to-text
│   │   └── tts.ts                 # Text-to-speech with ElevenLabs
│   ├── state/
│   │   ├── budget.ts              # Budget state management
│   │   └── finoraState.ts         # Conversation state
│   ├── components/
│   │   ├── AnimatedFinoraCharacter.tsx
│   │   ├── RecommendationsPanel.tsx
│   │   ├── SpendingAnalysisPanel.tsx
│   │   ├── TransactionHistoryPanel.tsx
│   │   └── ui/                    # shadcn/ui components
│   ├── pages/
│   │   └── Index.tsx              # Main app (926 lines)
│   └── data/
│       └── venues.json            # Venue recommendations database
├── supabase/functions/
│   ├── claude-intent/             # Claude AI processing
│   └── elevenlabs-tts/            # Text-to-speech generation
└── .env                           # Environment variables
```

---

## Setup and Installation

### Prerequisites

- Node.js 18+
- Supabase account (free tier)
- Anthropic API key
- ElevenLabs API key (free tier available)

### 1. Clone and Install

```bash
git clone https://github.com/CarlGergi/anthropichackaton.git
cd anthropichackaton
npm install
```

### 2. Environment Setup

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

**Get Supabase credentials:**
- Go to https://supabase.com/dashboard
- Select your project → Settings → API
- Copy Project URL and anon/public key

### 3. Deploy Supabase Edge Functions

Install Supabase CLI:
```bash
npm install -g supabase
```

Login and link project:
```bash
supabase login
supabase link --project-ref your_project_id
```

Set API keys as secrets:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
supabase secrets set ELEVENLABS_API_KEY=your-elevenlabs-key-here
```

**Get API Keys:**
- **Anthropic**: https://console.anthropic.com/ → API Keys
- **ElevenLabs**: https://elevenlabs.io/ → Profile → API Keys (free tier: 10k chars/month)

Deploy functions:
```bash
supabase functions deploy claude-intent
supabase functions deploy elevenlabs-tts
```

### 4. Run the App

```bash
npm run dev
```

Open http://localhost:5173 (or the port shown in terminal)

### Browser Requirements

- **Chrome or Edge** (Web Speech API support)
- Microphone permissions enabled
- HTTPS in production (required for mic access)

---

## How It Works

### Conversation Flow

1. **User speaks** → Web Speech API captures audio
2. **Text sent to Claude** → Supabase Edge Function processes request
3. **Claude analyzes** → Understands intent, generates personality response
4. **Response includes**:
   - Conversational speech (15-25 seconds)
   - Recommendations (if relevant)
   - Spending analysis (if requested)
   - State updates (budget changes, transactions)
5. **Speech generated** → ElevenLabs TTS converts to audio
6. **Finora speaks** → Audio plays with animated character
7. **State updated** → Budget/transactions saved to localStorage

### AI Architecture

**Claude Intent Recognition** (`supabase/functions/claude-intent/index.ts`)
- Analyzes user speech for intent (SET_BUDGET, ADD_EXPENSE, ADVICE, etc.)
- Generates Gen Z personality responses
- Returns structured JSON with speech, recommendations, analysis
- Uses Claude Sonnet 4 with 1500 max tokens

**Response Format:**
```typescript
{
  intent: "ADVICE" | "ADD_EXPENSE" | "AFFORDABILITY" | ...,
  entities: { amount, category, merchant, date },
  speech: "Full conversational response",
  recs: [{ name, est_cost, category }],
  analysis: { top_category, daily_avg, trend, insights },
  gesture: "THINK" | "THUMBS_UP" | ...,
  state_patch: { monthly_budget, categories }
}
```

### Data Models

**Budget State** (`src/state/budget.ts`)
```typescript
{
  month: "2025-01",
  total: 1000,
  categoryTargets: { food: 0.30, transport: 0.15, fun: 0.20, ... },
  spent: { food: 120, transport: 45, ... }
}
```

**Transaction**
```typescript
{
  id: "tx_...",
  date: "2025-01-15",
  amount: 50,
  merchant: "Pizza Place",
  category: "food",
  source: "voice" | "manual",
  rawText?: "Original speech"
}
```

### Features Breakdown

**Voice Recognition** (`src/voice/stt.ts`)
- Uses Web Speech API with continuous recognition
- Handles interim and final results
- Error recovery for "no-speech" and "network" errors
- Language support: en-US, en-GB, es-ES, fr-FR

**Text-to-Speech** (`src/voice/tts.ts`)
- ElevenLabs API with 9 voices (Rachel, Domi, Bella, Antoni, Josh, etc.)
- Global AudioContext reuse (fixes "MediaElementSource already exists" bug)
- Amplitude tracking for character animations
- Proper cleanup to prevent memory leaks

**Budget Calculations** (`src/state/budget.ts`)
- `calculateRemaining()` - Budget left per category
- `calculateForecast()` - Projected spending based on daily rate
- `calculateBuffer()` - Safety margin (remaining - forecast)
- `calculateDaysLeft()` - Days until month end

**Achievements** (`src/components/AchievementBadge.tsx`)
- Ramen Master 🍜 - Spent under $20 on food
- No Cap Saver 💰 - Saved 50% of budget
- Budget King 👑 - Stayed under budget all month
- And more...

**Keyboard Shortcuts** (`src/components/KeyboardShortcutsHelp.tsx`)
- `Space` - Toggle voice input
- `S` - Voice settings
- `D` - Debug panel
- `H` / `?` - Help
- `Escape` - Close panels

---

## Development

### Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint
npm run preview      # Preview production build
```

### Key Files to Understand

1. **`src/pages/Index.tsx`** (926 lines) - Main app component with all logic
2. **`src/ai/claude.ts`** - Claude API integration
3. **`src/voice/tts.ts`** - Audio playback with global AudioContext
4. **`src/state/budget.ts`** - Budget calculations and localStorage
5. **`supabase/functions/claude-intent/index.ts`** - Claude system prompt

---

## Troubleshooting

**White screen:**
- Check browser console (F12) for errors
- Verify `.env` file exists and has correct values
- Check that env vars are loaded (they'll show in console errors)

**Can't hear Finora:**
- Ensure Edge Functions are deployed: `supabase functions deploy`
- Verify secrets are set: `supabase secrets list`
- Check browser console for TTS errors
- Ensure audio isn't muted

**Microphone not working:**
- Use Chrome or Edge (Safari/Firefox not supported)
- Grant microphone permissions when prompted
- Check console for permission errors

**Edge Functions failing:**
- Check Supabase dashboard → Edge Functions → Logs
- Verify API keys are set as secrets (not in .env)
- Ensure Anthropic API key starts with `sk-ant-`

---

## Architecture Highlights

### Why This Stack?

**Claude Sonnet 4** - Best-in-class conversational AI with personality
**Supabase Edge Functions** - Serverless, globally distributed, Deno runtime
**ElevenLabs** - Most natural TTS available with free tier
**LocalStorage** - Privacy-first, no backend needed for user data
**Web Speech API** - Native browser speech recognition (Chrome/Edge only)

### Performance Optimizations

- Reused global AudioContext for audio playback
- Animation frames properly cleaned up
- Lazy-loaded venue database (3KB JSON)
- Debounced speech recognition
- Minimal re-renders with React.memo and useCallback

---

## Contributing

This is a hackathon project built for the Anthropic Hackathon. Contributions welcome!

---

## License

MIT License

---

**Made with 💜 by students, for students**
