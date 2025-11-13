import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Loader2, Volume2, Settings, Hand, Sparkles } from "lucide-react";
import DebugPanel from "@/components/DebugPanel";
import VoiceSettings from "@/components/VoiceSettings";
import { FinoraCharacter } from "@/components/FinoraCharacter";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VoiceState, ClaudeResponse, TTSResponse } from "@/types";
import { SpeechToText, STTSupport } from "@/voice/stt";
import { textToSpeech, playAudioFromBase64, unlockAudio } from "@/voice/tts";
import { getIntent } from "@/ai/claude";
import {
  loadBudget,
  loadTransactions,
  addTransaction,
  clearAllData,
  getDefaultBudget,
  calculateRemainingTotal,
  saveBudget
} from "@/state/budget";
import {
  loadFinoraState,
  saveFinoraState,
  mergeStatePatch,
  getDefaultFinoraState
} from "@/state/finoraState";
import venuesDataRaw from "@/data/venues.json";
import { Venue } from "@/types";

const venuesData = venuesDataRaw as Venue[];

const Index = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [budget, setBudget] = useState(loadBudget());
  const [transactions, setTransactions] = useState(loadTransactions());
  const [finoraState, setFinoraState] = useState(loadFinoraState());
  const [conversationStarted, setConversationStarted] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastClaudeResponse, setLastClaudeResponse] = useState<ClaudeResponse>();
  const [lastTTSResponse, setLastTTSResponse] = useState<TTSResponse>();
  const [stt] = useState(() => new SpeechToText());
  const [sttSupport, setSttSupport] = useState<STTSupport>(SpeechToText.checkSupport());
  const [sttLanguage, setSttLanguage] = useState(stt.getConfig().language || 'en-US');
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('finora_voice') || 'alloy';
  });
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Handle voice change
  const handleVoiceChange = useCallback((voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('finora_voice', voice);
    toast.success(`Voice changed to ${voice}`);
  }, []);


  // Start conversation handler
  const handleStartConversation = useCallback(async () => {
    logger.log('[Finora] Starting conversation...');
    
    // Unlock audio on user interaction
    unlockAudio();
    
    // Check mic support
    const support = SpeechToText.checkSupport();
    if (!support.hasWebSpeech) {
      toast.error('Your browser does not support speech recognition. Please try Chrome.');
      return;
    }
    
    // Request mic permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setSttSupport(prev => ({ ...prev, hasMicPermission: true }));
    } catch (error) {
      logger.error('[Finora] Mic permission denied:', error);
      toast.error('Microphone access blocked — please enable it and try again');
      setSttSupport(prev => ({ ...prev, hasMicPermission: false }));
      return;
    }
    
    setConversationStarted(true);
    
    // Greet only if first time AND intro not shown
    if (!finoraState.introShown) {
      logger.log('[Finora] First time user - playing intro greeting');
      await new Promise(resolve => setTimeout(resolve, 500));
      setVoiceState("speaking");
      
      try {
        const greetingText = "Hey there! I'm Finora — your finance buddy. Let's get your budget set up. What's your total for this month?";
        const ttsResponse = await textToSpeech(greetingText, selectedVoice, "cheerful");
        
          if (ttsResponse.audio_b64) {
            const audio = playAudioFromBase64(
              ttsResponse.audio_b64,
              ttsResponse.mime,
              () => {
                setVoiceState("idle");
                setCurrentAudio(null);
                // Mark intro as shown after greeting
                const updatedState = mergeStatePatch(finoraState, { introShown: true });
                setFinoraState(updatedState);
                saveFinoraState(updatedState);
                logger.log('[Finora] Intro shown, state updated');
              }
            );
            setCurrentAudio(audio);
          } else {
            setVoiceState("idle");
          }
      } catch (error) {
        logger.error('[Finora] Greeting failed:', error);
        setVoiceState("idle");
      }
    } else {
      logger.log('[Finora] Returning user - skipping intro (introShown=true)');
    }
  }, [finoraState]);

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
        logger.log('[Finora] Processing transcript:', text);
        logger.log('[Finora] Current state:', { 
          introShown: finoraState.introShown, 
          monthly_budget: finoraState.monthly_budget 
        });
        
        setVoiceState("thinking");

        const claudeResponse = await getIntent(text, budget, venuesData, finoraState);
        setLastClaudeResponse(claudeResponse);

        // Show recommendations panel if there are recommendations
        if (claudeResponse.recs && claudeResponse.recs.length > 0) {
          setShowRecommendations(true);
        }

        logger.log('[Finora] Claude response:', {
          intent: claudeResponse.intent,
          speech: claudeResponse.speech.substring(0, 50) + '...',
          state_patch: claudeResponse.state_patch,
          recommendations: claudeResponse.recs?.length || 0
        });

        // Handle state_patch from Claude
        if (claudeResponse.state_patch) {
          const updatedState = mergeStatePatch(finoraState, claudeResponse.state_patch);
          setFinoraState(updatedState);
          saveFinoraState(updatedState);
          logger.log('[Finora] State updated:', updatedState);
          
          // Update budget if monthly_budget changed
          if (claudeResponse.state_patch.monthly_budget !== undefined) {
            const newBudget = { ...budget };
            newBudget.total = claudeResponse.state_patch.monthly_budget || 0;
            setBudget(newBudget);
            saveBudget(newBudget);
            toast.success(`Budget set to $${claudeResponse.state_patch.monthly_budget}`);
          }
        }

        // Handle ADD_EXPENSE intent
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
            selectedVoice,
            claudeResponse.tts.style
          );
          setLastTTSResponse(ttsResponse);

          if (ttsResponse.audio_b64) {
            const audio = playAudioFromBase64(
              ttsResponse.audio_b64, 
              ttsResponse.mime, 
              () => {
                setVoiceState("idle");
                setCurrentAudio(null);
              }
            );
            setCurrentAudio(audio);
          } else {
            toast.error('Could not generate speech');
            setVoiceState("idle");
          }
        } catch (ttsError) {
          logger.error('[Finora] TTS failed:', ttsError);
          toast.error('Speech generation failed');
          setVoiceState("idle");
        }
      } catch (error) {
        logger.error("Processing error:", error);
        toast.error("Oops! Something went wrong");
        setVoiceState("idle");
      }
    },
    [budget, refreshData, finoraState]
  );

  // Check support on mount
  useEffect(() => {
    const support = SpeechToText.checkSupport();
    setSttSupport(support);
  }, []);

  // Handle voice toggle (only when conversation started)
  const handleVoiceToggle = useCallback(async () => {
    if (!conversationStarted) {
      toast.error('Please start the conversation first');
      return;
    }
    
    // Unlock audio on mic click
    unlockAudio();
    
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
            logger.error("[Voice] STT Error:", error, code);
            toast.error(error, { duration: 5000 });
            setVoiceState("idle");
            
            if (code === 'not-allowed') {
              setSttSupport(prev => ({ ...prev, hasMicPermission: false }));
            }
          }
        );
        
        setSttSupport(prev => ({ ...prev, hasMicPermission: true }));
      } catch (error) {
        logger.error('[Voice] Failed to start:', error);
        toast.error('Failed to start voice input');
        setVoiceState("idle");
      }
    } else if (voiceState === "listening") {
      stt.stop();
      setVoiceState("idle");
      toast.info("Stopped listening");
    }
  }, [conversationStarted, voiceState, stt, processTranscript]);

  // Handle end conversation
  const handleEndConversation = useCallback(() => {
    // Stop STT if listening
    if (voiceState === "listening") {
      stt.stop();
    }
    
    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    
    // Reset states
    setVoiceState("idle");
    setConversationStarted(false);
    
    toast.info("Conversation ended. Press Start to talk again.");
  }, [voiceState, stt, currentAudio]);

  // Handle reset
  const handleReset = useCallback(() => {
    logger.log('[Finora] Resetting all data...');
    
    // First end any active conversation
    if (voiceState === "listening") {
      stt.stop();
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    
    // Clear all localStorage data
    clearAllData();
    localStorage.removeItem("finora_state");
    
    // Reset all states to defaults
    const freshFinoraState = getDefaultFinoraState();
    const freshBudget = getDefaultBudget();
    
    setFinoraState(freshFinoraState);
    setBudget(freshBudget);
    setTransactions([]);
    setVoiceState("idle");
    setConversationStarted(false);
    setLastClaudeResponse(undefined);
    
    logger.log('[Finora] Reset complete - fresh state:', freshFinoraState);
    
    setShowResetDialog(false);
    toast.success("Finora forgot everything. Fresh start!");
  }, [voiceState, stt, currentAudio]);

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
    <div className="relative w-screen min-h-screen overflow-y-auto flex flex-col items-center font-sora py-8 gap-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full text-center px-4 max-w-4xl pt-4"
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

      {/* 3D Character - shows when conversation started */}
      {conversationStarted && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md px-4"
        >
          <FinoraCharacter 
            voiceState={voiceState} 
            gesture={lastClaudeResponse?.gesture}
          />
        </motion.div>
      )}

      {/* Start Conversation Button or Active Mic */}
      {!conversationStarted ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col items-center gap-6 mb-12"
        >
          <motion.button
            onClick={handleStartConversation}
            className="group relative px-12 py-6 text-xl font-bold text-white rounded-full
              bg-gradient-to-r from-violet-600 via-purple-600 to-teal-600
              shadow-[0_0_40px_rgba(139,92,246,0.5)]
              hover:shadow-[0_0_60px_rgba(139,92,246,0.7)]
              transition-all duration-300 ease-out
              hover:scale-105 active:scale-95
              border-2 border-white/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              boxShadow: [
                "0 0 40px rgba(139,92,246,0.5)",
                "0 0 60px rgba(139,92,246,0.7)",
                "0 0 40px rgba(139,92,246,0.5)",
              ],
            }}
            transition={{
              boxShadow: {
                repeat: Infinity,
                duration: 2,
              },
            }}
          >
            <span className="flex items-center gap-3">
              Start Conversation 🎤
            </span>
          </motion.button>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-white/60 text-center max-w-md px-4"
          >
            Press to activate voice and begin chatting with Finora
          </motion.p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-6 mb-8"
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
            transition={{ delay: 0.2 }}
            className="px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
          >
            <p className="text-sm font-medium text-white/90">
              {voiceState === "idle" && "Voice activated — talk to Finora anytime now!"}
              {voiceState === "listening" && "Listening..."}
              {voiceState === "thinking" && "Thinking..."}
              {voiceState === "speaking" && "Speaking..."}
            </p>
          </motion.div>
        </motion.div>
      )}

      {/* Control Buttons - Below Character */}
      {conversationStarted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-4 mb-12"
        >
          {/* End Conversation Button */}
          <motion.button
            onClick={handleEndConversation}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500
              text-white font-bold text-sm
              hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]
              transition-all duration-300 ease-out
              hover:scale-105 active:scale-95
              border border-white/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="flex items-center gap-2">
              <Hand className="w-4 h-4" />
              End Conversation
            </span>
          </motion.button>

          {/* Reset Button */}
          <motion.button
            onClick={() => setShowResetDialog(true)}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-teal-600
              text-white font-bold text-sm
              hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]
              transition-all duration-300 ease-out
              hover:scale-105 active:scale-95
              border border-white/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Reset
            </span>
          </motion.button>
        </motion.div>
      )}

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
          selectedVoice={selectedVoice}
          onVoiceChange={handleVoiceChange}
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
      
      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">Reset Finora?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              This will erase your budget data, categories, and all transaction history.
              Finora will start fresh and ask for your budget again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className="bg-gradient-to-r from-violet-600 to-teal-600 text-white hover:opacity-90"
            >
              Yes, reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recommendations Panel */}
      <AnimatePresence>
        {(() => {
          console.log('[Index] Recommendations check:', {
            showRecommendations,
            hasResponse: !!lastClaudeResponse,
            hasRecs: !!lastClaudeResponse?.recs,
            recsLength: lastClaudeResponse?.recs?.length || 0
          });

          return showRecommendations && lastClaudeResponse?.recs && lastClaudeResponse.recs.length > 0 ? (
            <RecommendationsPanel
              recommendations={lastClaudeResponse.recs}
              onClose={() => setShowRecommendations(false)}
            />
          ) : null;
        })()}
      </AnimatePresence>
    </div>
  );
};

export default Index;
