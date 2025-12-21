# Finora - Your AI Budget Bestie 💜

[▶️ **Live Demo**](https://youtu.be/zAN5Ru6b67E)

> A voice-first financial assistant that combines conversational AI, computer vision, and dual-perspective reasoning to make budgeting enjoyable for students.

**Built for the Anthropic Hackathon**

---

## 🎯 Choose Your Experience

### 💬 **Normal Mode** - Start Your Personal Budget Journey
- Build your budget from scratch
- Voice-driven setup
- Track your real expenses

### 🎓 **Demo Mode** - Explore with Alex Chen's Student Budget
- Pre-loaded $1000/month budget
- 28 authentic transactions
- Perfect for exploring features

**Switch modes anytime in Settings.**

---

## Core Features

### 🎤 Voice-First Budgeting
- Manual mic control - YOU decide when to stop speaking
- Natural conversations with Claude Sonnet 4
- Gen Z personality with real voice via ElevenLabs TTS

### 💰 Smart Spending Tracking
- Quick entry: "I spent $300"
- Optional category breakdown
- Real-time budget updates

### 📸 Finora Vision - AI Image Analysis
- Press 'C' to analyze receipts, menus, price tags
- Instant affordability ratings
- Budget-aware suggestions

### ⚖️ Finora Debates - Angel vs Devil Decision Making
- Press 'B' to hear both sides of any purchase
- Get Devil (emotional) and Angel (logical) perspectives
- Balanced verdict with alternatives

### 📊 Shareable Spending Report
- Share with parents, roommates, or keep records
- Download formatted text file

### 🎯 Intelligent Recommendations
- Proactive suggestions when budget is low
- 20+ Toronto venues pre-loaded

---

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **AI:** Claude Sonnet 4 (Conversational + Vision)
- **Voice:** ElevenLabs TTS + Web Speech API
- **Backend:** Supabase Edge Functions

---

## Setup

### Prerequisites
- Node.js 18+
- Supabase account
- Anthropic API key
- ElevenLabs API key

### Installation

1. **Clone and install:**
```bash
git clone https://github.com/CarlGergi/anthropichackaton.git
cd anthropichackaton
npm install
```

2. **Environment setup:**
Create `.env` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

3. **Deploy Supabase Edge Functions:**
```bash
npm install -g supabase
supabase login
supabase link --project-ref your_project_ref
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
supabase secrets set ELEVENLABS_API_KEY=your-elevenlabs-key-here

npx supabase functions deploy claude-intent
npx supabase functions deploy claude-vision
npx supabase functions deploy finora-debates
npx supabase functions deploy elevenlabs-tts
```

4. **Run the app:**
```bash
npm run dev
```

Open http://localhost:8080

### Browser Requirements
- Chrome or Edge (required for Web Speech API)
- Microphone and camera permissions

---

## Keyboard Shortcuts

- **Space** - Toggle voice input
- **C** - Capture image for Vision analysis
- **B** - Start Finora Debates
- **S** - Voice settings
- **H / ?** - Help
- **Escape** - Close panels

---

**Made with 💜 by the Finora team**
