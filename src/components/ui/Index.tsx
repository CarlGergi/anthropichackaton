import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mic, Loader2, Volume2, Settings } from "lucide-react";
import DebugPanel from "@/components/DebugPanel";
import VoiceSettings from "@/components/VoiceSettings";
import { VoiceState, ClaudeResponse, TTSResponse } from "@/types";
import { SpeechToText, STTSupport } from "@/voice/stt";
import { textToSpeech, playAudioFromBase64 } from "@/voice/tts";
import { getIntent } from "@/ai/claude";
import {
  loadBudget,
  loadTransactions,
  addTransaction,
  clearAllData,
  getDefaultBudget,
  calculateRemainingTotal,
} from "@/state/budget";
import venuesDataRaw from "@/data/venues.json";
import { Venue } from "@/types";

const venuesData = venuesDataRaw as Venue[];

const Index = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [budget, setBudget] = useState(loadBudget());
  const [transactions, setTransactions] = useState(loadTransactions());
  const [debugOpen, setDebugOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastClaudeResponse, setLastClaudeResponse] = useState<ClaudeResponse>();
  const [lastTTSResponse, setLastTTSResponse] = useState<TTSResponse>();
  const [stt] = useState(() => new SpeechToText());
  const [sttSupport, setSttSupport] = useState<STTSupport>(SpeechToText.checkSupport());
  const [sttLanguage, setSttLanguage] = useState(stt.getConfig().language || 'en-US');
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    const budget = loadBudget();
    return !localStorage.getItem('finora_visited') || budget.total === 0;
  });


  // Auto-greet on page load
  useEffect(() => {
    const speakGreeting = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('[Finora] Starting greeting...');
      setVoiceState("speaking");
      
      try {
        let greetingText: string;
        const remaining = calculateRemainingTotal(budget);
        
        if (isFirstVisit || budget.total === 0) {
          greetingText = "Hey there! I'm Finora — your broke-but-brilliant finance buddy. What's your total budget for this month?";
        } else {
          greetingText = `Welcome back! You've got $${remaining.toFixed(0)} left this month. What's the move?`;
        }
        
        const ttsResponse = await textToSpeech(greetingText, "George", "cheerful");
        
        if (ttsResponse.audio_b64) {
          playAudioFromBase64(
            ttsResponse.audio_b64,
            ttsResponse.mime,
            () => {
              setVoiceState("idle");
            }
          );
        } else {
          setVoiceState("idle");
        }
      } catch (error) {
        console.error('[Finora] Greeting failed:', error);
        setVoiceState("idle");
      }
    };
    
    speakGreeting();
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") {
        setDebugOpen((prev) => !prev);
      }
      if (e.key === "s" || e.key === "S") {
        setSettingsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        if (voiceState === "listening") {
          stt.stop();
          setVoiceState("idle");
        }
        if (settingsOpen) setSettingsOpen(false);
        if (debugOpen) setDebugOpen(false);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [voiceState, stt, settingsOpen, debugOpen]);

  // Refresh budget and transactions
  const refreshData = useCallback(() => {
    setBudget(loadBudget());
    setTransactions(loadTransactions());
  }, []);

  // Process transcript with Claude and TTS
  const processTranscript = useCallback(
    async (text: string) => {
      try {
        setVoiceState("thinking");
        
        if (isFirstVisit) {
          localStorage.setItem('finora_visited', 'true');
          setIsFirstVisit(false);
        }

        const claudeResponse = await getIntent(text, budget, venuesData, isFirstVisit);
        setLastClaudeResponse(claudeResponse);

        if (claudeResponse.intent === "ADD_EXPENSE" && claudeResponse.entities.amount) {
          addTransaction({
            date: claudeResponse.entities.date || new Date().toISOString().split("T")[0],
            amount: claudeResponse.entities.amount,
            merchant: claudeResponse.entities.merchant || "Unknown",
            category: claudeResponse.entities.category || "other",
            source: "voice",
            rawText: text,
          });
          refreshData();
        }
        
        setVoiceState("speaking");
        
        try {
          const ttsResponse = await textToSpeech(
            claudeResponse.speech,
            "George",
            claudeResponse.tts.style
          );
          setLastTTSResponse(ttsResponse);

          if (ttsResponse.audio_b64) {
            playAudioFromBase64(
              ttsResponse.audio_b64, 
              ttsResponse.mime, 
              () => {
                setVoiceState("idle");
              }
            );
          } else {
            toast.error('Could not generate speech');
            setVoiceState("idle");
          }
        } catch (ttsError) {
          console.error('[Finora] TTS failed:', ttsError);
          toast.error('Speech generation failed');
          setVoiceState("idle");
        }
      } catch (error) {
        console.error("Processing error:", error);
        toast.error("Oops! Something went wrong");
        setVoiceState("idle");
      }
    },
    [budget, refreshData, isFirstVisit]
  );

  // Check support on mount
  useEffect(() => {
    const support = SpeechToText.checkSupport();
    setSttSupport(support);
  }, []);

  // Handle voice toggle
  const handleVoiceToggle = useCallback(async () => {
    if (voiceState === "idle") {
      setVoiceState("listening");
      toast.success("🎤 Listening...");

      try {
        await stt.start(
          (text, isFinal) => {
            if (isFinal) {
              stt.stop();
              processTranscript(text);
            }
          },
          (error, code) => {
            console.error("[Voice] STT Error:", error, code);
            toast.error(error, { duration: 5000 });
            setVoiceState("idle");
            
            if (code === 'not-allowed') {
              setSttSupport(prev => ({ ...prev, hasMicPermission: false }));
            }
          }
        );
        
        setSttSupport(prev => ({ ...prev, hasMicPermission: true }));
      } catch (error) {
        console.error('[Voice] Failed to start:', error);
        toast.error('Failed to start voice input');
        setVoiceState("idle");
      }
    } else if (voiceState === "listening") {
      stt.stop();
      setVoiceState("idle");
      toast.info("Stopped listening");
    }
  }, [voiceState, stt, processTranscript]);


  const getStateIcon = () => {
    switch (voiceState) {
      case "listening":
        return <Mic className="w-12 h-12 text-white" />;
      case "thinking":
        return <Loader2 className="w-12 h-12 text-white animate-spin" />;
      case "speaking":
        return <Volume2 className="w-12 h-12 text-white" />;
      default:
        return <Mic className="w-12 h-12 text-white" />;
    }
  };

  const getStateText = () => {
    switch (voiceState) {
      case "listening":
        return "Listening...";
      case "thinking":
        return "Thinking...";
      case "speaking":
        return "Speaking...";
      default:
        return "Press to speak";
    }
  };

  const getStateColor = () => {
    switch (voiceState) {
      case "listening":
        return "from-[hsl(var(--voice-listening))] to-[hsl(var(--voice-listening))]/80 shadow-[0_0_60px_hsl(var(--voice-listening))/60]";
      case "thinking":
        return "from-[hsl(var(--voice-thinking))] to-[hsl(var(--voice-thinking))]/80 shadow-[0_0_60px_hsl(var(--voice-thinking))/60]";
      case "speaking":
        return "from-[hsl(var(--voice-speaking))] to-[hsl(var(--voice-speaking))]/80 shadow-[0_0_60px_hsl(var(--voice-speaking))/60]";
      default:
        return "from-[hsl(var(--finora-gradient-start))] to-[hsl(var(--finora-gradient-end))] shadow-[0_0_60px_hsl(var(--glow-primary))/50]";
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-y-auto flex flex-col items-center justify-center font-sora py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute top-8 text-center px-4 max-w-4xl"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
          Finora — The Voice of Your Wallet 🎙️
        </h1>
        <p className="text-lg md:text-xl text-white/80 font-inter mb-4">
          Talk. Laugh. Save. Repeat. Finora makes adulting kinda fun.
        </p>
        
        {/* Intro Paragraph */}
        <p className="text-sm md:text-base text-white/70 font-inter mb-6 leading-relaxed">
          <strong className="text-white/90">Built for students who are stressed about money.</strong><br />
          Finora helps you set a budget, track spending, and stay positive — even when you're broke.<br />
          She gets it. Rent, food, friends, life — it's a lot.<br />
          Just press the mic, talk, and let Finora help you figure things out.
        </p>
        
        {/* What Finora Does */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white/90 mb-3 font-inter text-center">
            What Finora Does
          </h2>
          <ul className="space-y-2 text-sm md:text-base text-white/70 font-inter text-center">
            <li>Talks with you (literally) about your budget and spending</li>
            <li>Tracks every expense through your voice</li>
            <li>Creates simple, fun plans that keep you on track</li>
            <li>Encourages you with humor and realistic advice</li>
          </ul>
          <p className="text-xs md:text-sm text-white/50 mt-4 italic text-center">
            All your data stays local on your device. Finora's chill like that 😎.
          </p>
        </div>
      </motion.div>

      {/* Main Mic Button */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col items-center gap-6 mt-auto mb-12"
      >
        <motion.button
          onClick={handleVoiceToggle}
          disabled={voiceState === "thinking" || voiceState === "speaking"}
          className={`
            relative w-32 h-32 md:w-40 md:h-40 rounded-full backdrop-blur-xl border-2 border-white/30
            flex items-center justify-center
            transition-all duration-300 ease-out
            disabled:opacity-70 disabled:cursor-not-allowed
            hover:scale-105 active:scale-95
            bg-gradient-to-br
            ${getStateColor()}
          `}
          whileTap={{ scale: 0.95 }}
          animate={
            voiceState === "listening"
              ? {
                  scale: [1, 1.05, 1],
                  transition: { repeat: Infinity, duration: 1.5 },
                }
              : {}
          }
        >
          {/* Pulse ring for listening */}
          {voiceState === "listening" && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/40"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.5,
              }}
            />
          )}
          
          {getStateIcon()}
        </motion.button>

        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
        >
          <p className="text-sm font-medium text-white/90">
            {getStateText()}
          </p>
        </motion.div>
      </motion.div>

      {/* Settings Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={() => setSettingsOpen(!settingsOpen)}
        className="absolute top-4 right-4 p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
      >
        <Settings className="w-5 h-5 text-white/70" />
      </motion.button>

      {/* Voice Settings Panel */}
      {settingsOpen && (
        <VoiceSettings
          language={sttLanguage}
          onLanguageChange={(lang) => {
            setSttLanguage(lang);
            stt.setLanguage(lang);
            toast.success(`Language set to ${lang}`);
          }}
        />
      )}

      {/* Debug Panel */}
      <DebugPanel
        isOpen={debugOpen}
        onClose={() => setDebugOpen(false)}
        lastClaudeResponse={lastClaudeResponse}
        lastTTSResponse={lastTTSResponse}
        sttSupport={sttSupport}
        sttEngine={'webspeech'}
        sttLastError={stt.getLastError()}
      />
      
      {/* Keyboard shortcut */}
      <div className="fixed bottom-4 right-4 text-xs text-white/30 font-mono">
        Press 'D' for debug
      </div>
    </div>
  );
};

export default Index;
