# Finora - Your AI Budget Buddy

> A voice-first AI financial assistant designed specifically for students who need help managing their money without the stress.

Finora is an emotionally intelligent, conversational AI that helps students track expenses, make smart spending decisions, and maintain their budget through natural voice conversations. Built for the Anthropic Hackathon.

## Features

### Voice-First Experience
- **Natural Conversations**: Talk to Finora like a friend, not a corporate finance app
- **Real-time Speech Recognition**: Browser-based speech-to-text (Web Speech API)
- **Natural Voice Responses**: Text-to-speech powered by OpenAI's TTS API
- **Smart Intent Detection**: Claude Sonnet 4 understands context and provides personalized advice

### Budget Management
- **Quick Setup**: Just tell Finora your monthly budget to get started
- **Expense Tracking**: Record spending through natural conversation
- **Affordability Checks**: Ask "Can I afford this?" before making purchases
- **Category Breakdown**: Track spending across food, transport, fun, essentials, clothes, and other
- **Real-time Insights**: Get instant feedback on your remaining budget and daily allowance

### Personality
Finora is designed to be:
- **Relatable**: Uses slang and humor that resonates with students
- **Supportive**: Understands the stress of balancing rent, food, and social life
- **Honest**: Gives you the truth, even when it's not what you want to hear
- **Funny**: Makes budgeting less boring with witty responses

Example responses:
- "You've got $90 left — that's like three days of noodles or one sushi date. Choose wisely."
- "You could afford it, but your wallet might cry tomorrow."
- "Bro… that $7 latte was 1% of your rent."

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Fast build tool
- **TailwindCSS** - Styling
- **shadcn/ui** - UI components
- **Framer Motion** - Animations
- **React Query** - State management
- **React Router** - Navigation

### Backend & AI
- **Supabase** - Backend infrastructure and edge functions
- **Claude Sonnet 4** (Anthropic) - Intent detection and conversational AI
- **OpenAI TTS** - Text-to-speech generation
- **Web Speech API** - Browser-based speech recognition

### 3D Character
- **Three.js** - 3D rendering
- **React Three Fiber** - React integration for Three.js
- **Drei** - Three.js helpers

## Project Structure

```
anthropichackaton/
├── src/
│   ├── ai/               # Claude AI integration
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── FinoraCharacter.tsx
│   │   ├── VoiceSettings.tsx
│   │   ├── BudgetPanel.tsx
│   │   └── DebugPanel.tsx
│   ├── data/            # Venue recommendations data
│   ├── hooks/           # Custom React hooks
│   ├── integrations/    # Supabase client
│   ├── pages/           # Page components
│   ├── state/           # State management
│   ├── types/           # TypeScript types
│   ├── voice/           # Speech-to-text & text-to-speech
│   └── lib/             # Utilities
├── supabase/
│   └── functions/       # Edge functions
│       ├── claude-intent/       # Claude AI intent detection
│       ├── elevenlabs-tts/      # TTS generation
│       └── generate-character/  # Character image generation
├── public/              # Static assets
└── ...config files
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- API keys:
  - Anthropic API key (for Claude)
  - OpenAI API key (for TTS)
  - Supabase project credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CarlGergi/anthropichackaton.git
cd anthropichackaton
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

4. Configure Supabase secrets:

In your Supabase dashboard, add these secrets for edge functions:
- `ANTHROPIC_API_KEY` - Your Anthropic API key
- `OPENAI_API_KEY` - Your OpenAI API key

### Running Locally

1. Start the development server:
```bash
npm run dev
```

2. Deploy Supabase functions (if needed):
```bash
supabase functions deploy claude-intent
supabase functions deploy elevenlabs-tts
supabase functions deploy generate-character
```

3. Open your browser to `http://localhost:5173`

### Browser Compatibility

Finora requires:
- Modern browser with Web Speech API support (Chrome recommended)
- Microphone access for voice input
- Audio playback capability

## How It Works

### Conversation Flow

1. **User speaks**: Web Speech API captures audio and converts to text
2. **Intent detection**: Text is sent to Claude via Supabase edge function
3. **AI processing**: Claude analyzes the request, checks budget, and generates a response
4. **Response generation**: Response is converted to speech via OpenAI TTS
5. **Audio playback**: Base64 audio is played back to the user
6. **State update**: Budget and transaction state is updated locally

### AI Architecture

The Claude intent function (`supabase/functions/claude-intent/index.ts`) handles:
- **Context building**: Sends current budget, transactions, and state
- **Structured prompts**: Guides Claude to return consistent JSON responses
- **State management**: Tracks conversation state (intro shown, budget set, etc.)
- **Intent classification**: Categorizes user requests (affordability, expense, advice, etc.)

### Data Persistence

- **localStorage**: Stores budget, transactions, and Finora state
- **No backend database**: All data is stored client-side for privacy
- **Reset capability**: Users can clear all data at any time

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Configuration

### Voice Settings
Users can customize:
- Voice selection (alloy, echo, fable, nova, shimmer)
- Speech recognition language
- TTS style (cheerful, calm, neutral)

### Budget Categories
- Food
- Transport
- Fun
- Essentials
- Clothes
- Other

## Contributing

This project was built for the Anthropic Hackathon. Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Known Issues

- Speech recognition only works in Chrome and Edge (Web Speech API limitation)
- Requires HTTPS in production for microphone access
- First audio playback may require user interaction on some browsers

## Future Improvements

- [ ] Backend database integration for persistent storage
- [ ] Multi-device sync
- [ ] Receipt scanning with OCR
- [ ] Bank account integration
- [ ] Budget recommendations based on spending patterns
- [ ] Social features (compare with friends)
- [ ] Mobile app version

## License

This project is open source and available under the MIT License.

## Acknowledgments

- Built with [Claude](https://www.anthropic.com/claude) by Anthropic
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Inspired by the need for student-friendly financial tools
- Created for the Anthropic Hackathon

## Contact

For questions or feedback, please open an issue on GitHub.

---

Made with ❤️ for students who need a budget buddy, not a boring spreadsheet.
