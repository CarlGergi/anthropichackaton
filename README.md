# Finora - Your Gen Z Budget Bestie 💜

> **Not another boring budget app.** Finora is your ride-or-die AI bestie who helps broke college students survive financially through hilarious, supportive voice conversations.

Finora isn't just tracking your spending — she's your hype person, your financial therapist, and your comedy relief all in one. She uses heavy Gen Z slang, makes casino jokes when you overspend, roasts your dating budget, and actually CARES about keeping you from going broke before finals week.

**Built for the Anthropic Hackathon** | **Powered by Claude Sonnet 4**

---

## 🎯 What Makes Finora Different?

### She's Your ACTUAL Friend, Not a Tool

Most budget apps are cold, corporate, and boring. Finora is:
- **Your bestie who gets it** - She understands broke college life, ramen dinners, and date budget struggles
- **Genuinely supportive** - Celebrates your wins, empathizes when you're broke, never judges
- **Hilarious** - Makes jokes about casinos, dating, coffee addiction, and student life
- **Conversational** - Has actual 15-25 second conversations, not robotic one-liners
- **Proactive** - Offers cheap recommendations when you're low on money WITHOUT you asking

### Real Personality Examples

**When you're doing well:**
> "Bro you're absolutely SLAYING this budget game right now, no cap! You've got $200 left and we're only halfway through the month? That's a W in my book! Keep this energy going bestie. Want me to find you some cheap spots to celebrate without breaking the bank?"

**When you're broke:**
> "Okay okay I see you living that ramen life fr fr. You've got like $30 left but listen bro, we're NOT going to the casino to fix this. I got you. Let me hook you up with some super cheap eats and we'll get through this together, bet? There's this spot that does tacos for like 2 bucks, and honestly they're bussin."

**When asking about dates:**
> "Ohhh taking someone special out? I see you! Okay so like, you don't need to drop $100 to impress them, deadass. Let me find you some lowkey romantic spots that won't destroy your budget. You trying to eat this month or nah?"

**Random support:**
> "Ngl I'm proud of you for even tracking your spending. Most people just ignore their bank account and pray, but you're out here being responsible. That's growth bestie!"

---

## ✨ Core Features

### 🎤 Voice-First Conversations
- **Talk naturally** - No buttons, no forms. Just press mic and talk like you're texting your friend
- **She responds with personality** - Not generic responses. Full conversations with jokes, tips, and follow-ups
- **Real-time speech** - Web Speech API captures your voice instantly
- **Natural TTS** - OpenAI's voices make her sound human, not robotic

### 💸 Smart Budget Management
- **Quick setup** - "My budget is $1000" and you're done
- **Voice expense tracking** - "I spent $50 on food" automatically logs it
- **Affordability checks** - "Can I afford a $30 shirt?" gets honest advice
- **Category tracking** - Food, transport, fun, essentials, clothes, other
- **Real-time remaining budget** - Always knows how broke you are

### 🎯 Proactive Recommendations (THE GAME CHANGER)
When you're low on money (under $100 left), Finora IMMEDIATELY offers cheap spots:
- **3-5 venue recommendations** sorted by cheapest first
- **Commentary on each spot** - "This taco place is bussin fr"
- **Visual panel** - Animated recommendations appear LEFT of Finora's character
- **Automatic triggers** - Asks about going out, eating, fun activities, or when giving advice

Example venues from our database:
- Dollar Pizza ($5) 🍕
- Taco Tuesday ($8) 🌮
- Library Coffee (Free!) ☕
- Park Hangout (Free!) 🌳

### 📊 Spending Pattern Analysis (Powered by Claude)
Ask "How am I doing?" or "Analyze my spending" and get:
- **Top spending category** - With total spent
- **Daily average** - How much you burn per day
- **Trend analysis** - Are you increasing, decreasing, or stable?
- **Funny personalized insights** - "You're spending mad money on food bro, but I get it - studying makes you hungry"
- **Visual panel** - Animated analysis appears RIGHT of Finora's character

### 🎭 Gen Z Personality (THE SOUL OF FINORA)
Uses heavy Gen Z slang in EVERY response:
- **Slang**: bro, bestie, fr (for real), ngl (not gonna lie), lowkey, highkey, no cap, deadass, bet, vibes, slay, ate, bussin, mid, L, W
- **Jokes**: Casino (when overspending), dates, ramen life, being broke, finals stress, coffee addiction
- **Humor**: Self-deprecating, relatable, makes budgeting fun
- **Empathy**: "I get it - student life is tough"
- **Hype**: Celebrates every win like your biggest fan

---

## 🛠 Tech Stack

### Frontend
- **React 18** + TypeScript - Modern UI framework
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first styling
- **shadcn/ui** - Beautiful component library
- **Framer Motion** - Smooth animations for panels and character

### AI & Backend
- **Claude Sonnet 4** (Anthropic) - The brain! Powers all conversations, intent detection, analysis
- **Supabase Edge Functions** - Serverless backend (Deno runtime)
- **OpenAI TTS API** - Natural voice generation (voices: alloy, echo, fable, nova, shimmer, onyx)
- **Web Speech API** - Browser-based speech recognition

### Key AI Features
- **Extended conversations** - 15-25 second responses (1500 max tokens)
- **Temperature 1.0** - Natural, varied personality
- **Context-aware** - Remembers your budget, spending patterns, conversation state
- **Proactive** - Suggests things without being asked
- **Structured prompts** - Returns JSON with speech, recommendations, analysis, gestures

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and npm
- **Supabase account** (free tier works!)
- **API Keys**:
  - Anthropic API key (for Claude)
  - OpenAI API key (for TTS)
  - Supabase credentials

### Installation

1. **Clone the repo:**
```bash
git clone https://github.com/CarlGergi/anthropichackaton.git
cd anthropichackaton
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

4. **Configure Supabase secrets:**

In your Supabase dashboard → Project Settings → Edge Functions → Secrets:
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `OPENAI_API_KEY` - Your OpenAI API key

5. **Deploy Supabase functions:**
```bash
supabase functions deploy claude-intent
supabase functions deploy elevenlabs-tts
```

**Important:** The `elevenlabs-tts` function actually uses OpenAI's TTS API (legacy naming from development).

6. **Start the dev server:**
```bash
npm run dev
```

7. **Open `http://localhost:8080`** and start talking to Finora! 🎉

### Browser Requirements
- **Chrome or Edge** (for Web Speech API)
- **Microphone access** enabled
- **Audio playback** enabled
- **HTTPS in production** (required for mic access)

---

## 💡 How It Works

### The Conversation Flow

1. **You speak** → Web Speech API converts to text
2. **Text sent to Claude** → Supabase Edge Function processes request
3. **Claude analyzes** → Understands context, checks budget, generates personality response
4. **Response includes**:
   - Conversational speech (15-25 seconds)
   - Recommendations (if relevant)
   - Spending analysis (if requested)
   - Gesture animation
   - State updates
5. **Speech generated** → OpenAI TTS converts to audio
6. **Finora speaks** → Audio plays while visual panels appear
7. **State updated** → Budget/transactions saved to localStorage

### The AI Magic (Claude Sonnet 4)

**System Prompt** (supabase/functions/claude-intent/index.ts:47-117):
- Defines Finora's Gen Z personality
- Examples of conversation styles (when doing well, broke, dates, etc.)
- Rules for when to give recommendations (under $100, asking about going out, etc.)
- Instructions for spending analysis
- Critical rule: ALWAYS keep conversation going

**Response Format**:
```json
{
  "intent": "ADVICE",
  "speech": "Full conversational response with jokes and tips",
  "recs": [{"name":"Cheap Taco Spot","est_cost":8,"category":"food"}],
  "analysis": {"top_category":"food","top_amount":120,"daily_avg":15,"trend":"increasing"},
  "gesture": "THUMBS_UP",
  "state_patch": {}
}
```

### Visual Panels

**Recommendations Panel** (src/components/RecommendationsPanel.tsx):
- Appears on LEFT side of character
- Speech bubble design pointing to Finora
- Animated bullet points
- Shows venue name, category, estimated cost
- Close button to dismiss

**Spending Analysis Panel** (src/components/SpendingAnalysisPanel.tsx):
- Appears on RIGHT side of character
- Beautiful gradient cards
- Shows top category, daily average, trend indicator
- Animated insights with humor
- Color-coded by trend (red=increasing, green=decreasing, blue=stable)

---

## 📁 Project Structure

```
anthropichackaton/
├── src/
│   ├── ai/
│   │   └── claude.ts              # Claude API integration
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── FinoraCharacter.tsx    # Animated character with Framer Motion
│   │   ├── RecommendationsPanel.tsx  # Left panel (recs)
│   │   ├── SpendingAnalysisPanel.tsx # Right panel (analysis)
│   │   ├── VoiceSettings.tsx      # Voice/language settings
│   │   └── DebugPanel.tsx         # Debug info
│   ├── data/
│   │   └── venues.json            # Recommendation venues database
│   ├── pages/
│   │   └── Index.tsx              # Main app component
│   ├── state/
│   │   ├── budget.ts              # Budget management
│   │   └── finoraState.ts         # Conversation state
│   ├── types/
│   │   └── index.ts               # TypeScript types
│   ├── voice/
│   │   ├── stt.ts                 # Speech-to-text
│   │   └── tts.ts                 # Text-to-speech
│   └── lib/
│       └── logger.ts              # Production-friendly logging
├── supabase/
│   └── functions/
│       ├── claude-intent/         # 🧠 THE BRAIN - Claude AI processing
│       ├── elevenlabs-tts/        # OpenAI TTS generation (legacy name)
│       └── generate-character/    # Character image generation (unused)
└── .vscode/
    └── settings.json              # Deno config for Edge Functions
```

---

## 🎮 Testing Finora

### First Time Setup
1. Click "Start Conversation"
2. Finora greets: "Yooo what's good! I'm Finora..."
3. Say: "My budget is $1000"
4. She'll confirm and ask what's next

### Adding Expenses
- "I spent $50 on groceries"
- "I bought coffee for $7"
- "Went out and spent $80"

### Getting Recommendations
- "Where can I eat cheap?"
- "I'm broke, what should I do?"
- "Find me cheap restaurants"
→ Recommendations panel appears on LEFT

### Spending Analysis
- "How am I doing?"
- "Analyze my spending"
- "Should I be worried?"
→ Analysis panel appears on RIGHT

### Affordability Checks
- "Can I afford a $50 shirt?"
- "Should I go out tonight?"
→ Gets honest, funny advice

### Just Chatting
- "I'm stressed about money"
- "I need motivation"
- "Tell me I'm doing okay"
→ Supportive bestie mode activated

---

## 🎨 Customization

### Voice Settings
Press **S** or click Settings icon to customize:
- **Voice**: alloy, echo, fable, nova, shimmer, onyx
- **Language**: en-US, en-GB, es-ES, fr-FR, etc.

### Debug Mode
Press **D** to open debug panel showing:
- Last Claude response (JSON)
- Last TTS response
- Speech recognition status
- Current state

---

## 🐛 Known Issues & Limitations

- **Speech recognition**: Chrome/Edge only (Web Speech API limitation)
- **HTTPS required**: Microphone access needs HTTPS in production
- **First audio**: May need user interaction on some browsers
- **No persistence**: Data is localStorage only (privacy-first but no sync)

---

## 🚀 Future Ideas

- [ ] Receipt scanning with Claude Vision
- [ ] Bank account integration (Plaid)
- [ ] Social features (compare budgets anonymously)
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Shared budget with roommates
- [ ] Savings goals with progress tracking

---

## 🙏 Acknowledgments

- **Anthropic** - Claude Sonnet 4 powers every conversation
- **OpenAI** - TTS voices bring Finora to life
- **Supabase** - Edge Functions make deployment easy
- **shadcn/ui** - Beautiful, accessible components
- **The broke college students** who inspired this project

---

## 📝 License

MIT License - Open source and free to use!

---

## 💬 Contact

Questions? Issues? Want to contribute?
- Open an issue on GitHub
- Built for the Anthropic Hackathon

---

**Made with 💜 by students, for students who need a budget buddy that actually GETS it.**

*Finora: Because budgeting shouldn't feel like a chore. It should feel like texting your funniest, most supportive friend who happens to be really good with money.*
