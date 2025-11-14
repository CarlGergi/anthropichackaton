# Finora Setup Guide 🚀

Complete step-by-step instructions to get Finora running on your machine.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
1. **Node.js 18+** and npm
   - Check version: `node --version` (should be 18.x or higher)
   - Download from: https://nodejs.org/

2. **Git**
   - Check version: `git --version`
   - Download from: https://git-scm.com/

3. **Supabase CLI** (for deploying Edge Functions)
   - Install: `npm install -g supabase`
   - Verify: `supabase --version`

### Required Accounts & API Keys
1. **Supabase Account** (free tier works!)
   - Sign up at: https://supabase.com/
   - Create a new project and note down:
     - Project URL (e.g., `https://xxxxx.supabase.co`)
     - Anon/Public Key
     - Project Reference ID

2. **Anthropic API Key** (for Claude AI)
   - Sign up at: https://console.anthropic.com/
   - Create API key at: https://console.anthropic.com/settings/keys
   - Required for: All AI conversations with Finora

3. **OpenAI API Key** (for Text-to-Speech)
   - Sign up at: https://platform.openai.com/
   - Create API key at: https://platform.openai.com/api-keys
   - Required for: Voice generation

---

## 🛠️ Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/CarlGergi/anthropichackaton.git
cd anthropichackaton
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React 18 + TypeScript
- Vite (build tool)
- Supabase client
- TailwindCSS + shadcn/ui
- Framer Motion
- And more...

**Expected time:** 2-3 minutes

---

## 🔧 Environment Configuration

### Step 3: Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### Step 4: Configure Frontend Environment Variables

Edit the `.env` file with your Supabase credentials:

```env
# --- Frontend (Vite) ---
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key_here
```

**Where to find these values:**
1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Project API keys** → **anon/public** → `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## 🔐 Supabase Setup

### Step 5: Link to Your Supabase Project

```bash
supabase link --project-ref your-project-ref-id
```

**To find your project reference ID:**
1. Go to Supabase dashboard → **Settings** → **General**
2. Find **Reference ID** (usually starts with a short alphanumeric string)

### Step 6: Configure Supabase Secrets

You need to add your API keys as **secrets** in Supabase (NOT in the `.env` file).

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to your Supabase project
2. Navigate to **Project Settings** → **Edge Functions**
3. Scroll to **Environment Variables / Secrets**
4. Add the following secrets:
   - **Key:** `ANTHROPIC_API_KEY` → **Value:** Your Anthropic API key
   - **Key:** `OPENAI_API_KEY` → **Value:** Your OpenAI API key

**Option B: Using Supabase CLI**

```bash
supabase secrets set ANTHROPIC_API_KEY=your_anthropic_api_key_here
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
```

### Step 7: Deploy Supabase Edge Functions

Deploy the backend functions to Supabase:

```bash
# Deploy the Claude intent processing function
supabase functions deploy claude-intent

# Deploy the text-to-speech function (uses OpenAI TTS)
supabase functions deploy elevenlabs-tts
```

**Note:** The `elevenlabs-tts` function is a legacy name from development - it actually uses OpenAI's TTS API.

**Expected output:**
```
✓ Deployed Function claude-intent on project xxxxx
✓ Deployed Function elevenlabs-tts on project xxxxx
```

---

## 🚀 Running the Application

### Step 8: Start the Development Server

```bash
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:8080/
➜  Network: use --host to expose
```

### Step 9: Open in Browser

1. Open your browser (Chrome or Edge recommended)
2. Navigate to: `http://localhost:8080`
3. Allow microphone access when prompted

---

## 🎮 Testing Finora

### First Conversation

1. Click **"Start Conversation"** button
2. Finora will greet you: *"Yooo what's good! I'm Finora..."*
3. Click the microphone button and say: **"My budget is $1000"**
4. She'll confirm and ask what's next

### Try These Commands

**Setting up:**
- "My monthly budget is $1500"
- "I want to track my expenses"

**Adding expenses:**
- "I spent $50 on groceries"
- "I bought coffee for $7"
- "Went out and spent $80 on food"

**Getting recommendations:**
- "Where can I eat cheap?"
- "I'm broke, what should I do?"
- "Find me cheap restaurants"
  → Recommendations panel appears on the LEFT

**Spending analysis:**
- "How am I doing?"
- "Analyze my spending"
- "Show me my spending patterns"
  → Analysis panel appears on the RIGHT

**Affordability checks:**
- "Can I afford a $50 shirt?"
- "Should I go out tonight?"

**Just chatting:**
- "I'm stressed about money"
- "I need motivation"
- "Tell me I'm doing okay"

---

## 🌐 Browser Requirements

### Supported Browsers
- ✅ **Google Chrome** (recommended)
- ✅ **Microsoft Edge**
- ⚠️ Firefox (speech recognition may not work)
- ⚠️ Safari (speech recognition may not work)

### Required Permissions
- **Microphone access** - for voice input
- **Audio playback** - for Finora's voice responses

### Important Notes
- Speech recognition uses the Web Speech API (Chrome/Edge only)
- HTTPS is required in production for microphone access
- First audio playback may require user interaction on some browsers

---

## ⚙️ Additional Features

### Voice Settings
Press **S** or click the Settings icon to customize:
- **Voice options:** alloy, echo, fable, nova, shimmer, onyx
- **Language:** en-US, en-GB, es-ES, fr-FR, etc.

### Debug Mode
Press **D** to open the debug panel showing:
- Last Claude response (JSON)
- Last TTS response
- Speech recognition status
- Current app state

---

## 🐛 Troubleshooting

### Issue: "npm install" fails
**Solution:** Make sure you're using Node.js 18 or higher
```bash
node --version  # Should be 18.x or higher
```

### Issue: Supabase CLI not found
**Solution:** Install globally
```bash
npm install -g supabase
```

### Issue: Edge Functions deployment fails
**Solutions:**
1. Make sure you're linked to the correct project: `supabase link --project-ref your-ref-id`
2. Check your Supabase CLI is up to date: `supabase --version`
3. Verify you have the correct permissions in your Supabase project

### Issue: Microphone not working
**Solutions:**
1. Use Chrome or Edge browser
2. Check browser permissions (address bar icon)
3. Make sure you're on HTTPS in production

### Issue: Finora doesn't respond
**Solutions:**
1. Check browser console for errors (F12)
2. Verify your Supabase secrets are set correctly:
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
3. Check Edge Functions are deployed:
   ```bash
   supabase functions list
   ```
4. Check if you have API credits/quota on Anthropic and OpenAI

### Issue: "TypeError: Cannot read property 'XXX'"
**Solution:** Clear localStorage and refresh:
```javascript
// In browser console (F12)
localStorage.clear()
location.reload()
```

---

## 📦 Build for Production

### Development Build
```bash
npm run build:dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

The built files will be in the `dist/` folder.

---

## 📁 Project Structure Reference

```
anthropichackaton/
├── src/
│   ├── ai/claude.ts              # Claude API integration
│   ├── components/
│   │   ├── FinoraCharacter.tsx   # Animated character
│   │   ├── RecommendationsPanel.tsx  # Left panel
│   │   ├── SpendingAnalysisPanel.tsx # Right panel
│   │   └── VoiceSettings.tsx     # Settings
│   ├── data/venues.json          # Recommendation database
│   ├── pages/Index.tsx           # Main app
│   ├── voice/
│   │   ├── stt.ts                # Speech-to-text
│   │   └── tts.ts                # Text-to-speech
│   └── state/
│       ├── budget.ts             # Budget management
│       └── finoraState.ts        # Conversation state
├── supabase/functions/
│   ├── claude-intent/            # 🧠 Claude AI processing
│   └── elevenlabs-tts/           # OpenAI TTS generation
└── .env                          # Your environment variables
```

---

## 🔑 API Keys Checklist

Before running, make sure you have:

- [ ] Supabase project created
- [ ] `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] Anthropic API key added to Supabase secrets (`ANTHROPIC_API_KEY`)
- [ ] OpenAI API key added to Supabase secrets (`OPENAI_API_KEY`)
- [ ] Edge Functions deployed (`claude-intent` and `elevenlabs-tts`)
- [ ] Chrome or Edge browser ready
- [ ] Microphone access granted

---

## 💰 Cost Estimate

**Supabase:** Free tier is sufficient for testing/development

**Anthropic Claude API:**
- Claude Sonnet 4: ~$15/million tokens
- Typical conversation: 1,000-2,000 tokens
- Estimated cost: $0.015-$0.030 per conversation

**OpenAI TTS:**
- $15.00 per 1M characters
- Typical response: 200-500 characters
- Estimated cost: $0.003-$0.008 per response

**Total per conversation:** ~$0.02-$0.04 (very affordable for testing!)

---

## 🎯 Quick Start Summary

```bash
# 1. Clone and install
git clone https://github.com/CarlGergi/anthropichackaton.git
cd anthropichackaton
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Link Supabase
supabase link --project-ref your-project-ref-id

# 4. Set secrets
supabase secrets set ANTHROPIC_API_KEY=your_key
supabase secrets set OPENAI_API_KEY=your_key

# 5. Deploy functions
supabase functions deploy claude-intent
supabase functions deploy elevenlabs-tts

# 6. Run
npm run dev
```

Open `http://localhost:8080` and start talking to Finora! 🎉

---

## 📞 Need Help?

- Check the main [README.md](README.md) for feature details
- Open an issue on GitHub
- Review Supabase logs: Project → Logs → Edge Functions

---

**Made with 💜 for students who need a budget buddy that actually GETS it.**
