import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Loader2, Volume2, Settings, Hand, Sparkles, History, Download, Upload, Camera, Scale } from "lucide-react";
import DebugPanel from "@/components/DebugPanel";
import VoiceSettings from "@/components/VoiceSettings";
import { AnimatedFinoraCharacter } from "@/components/AnimatedFinoraCharacter";
import { ConfettiCelebration } from "@/components/ConfettiCelebration";
import { AchievementBadge } from "@/components/AchievementBadge";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { SpendingAnalysisPanel } from "@/components/SpendingAnalysisPanel";
import { QuickStatsDashboard } from "@/components/QuickStatsDashboard";
import { TransactionHistoryPanel } from "@/components/TransactionHistoryPanel";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
import { BudgetProgressIndicators } from "@/components/BudgetProgressIndicators";
import { VisionResultPanel } from "@/components/VisionResultPanel";
import { FinoraDebatesPanel } from "@/components/FinoraDebatesPanel";
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
import { VoiceState, ClaudeResponse, TTSResponse, CategoryType, VisionAnalysisResult, DebateResult } from "@/types";
import { SpeechToText, STTSupport } from "@/voice/stt";
import { textToSpeech, playAudioFromBase64, unlockAudio } from "@/voice/tts";
import { getIntent } from "@/ai/claude";
import { supabase } from "@/integrations/supabase/client";
import {
  loadBudget,
  loadTransactions,
  addTransaction,
  deleteTransaction,
  clearAllData,
  getDefaultBudget,
  calculateRemainingTotal,
  saveBudget,
  saveTransactions,
  initializeDemoData,
  forceLoadDemoData
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
  const [budget, setBudget] = useState(() => {
    try {
      const loadedBudget = loadBudget();
      logger.log('[Index] Loaded budget:', loadedBudget);
      return loadedBudget;
    } catch (error) {
      logger.error('[Index] Failed to load budget:', error);
      return getDefaultBudget();
    }
  });
  const [transactions, setTransactions] = useState(() => {
    try {
      const loadedTransactions = loadTransactions();
      // Transactions should already be loaded by the budget initialization above
      return loadedTransactions;
    } catch (error) {
      logger.error('[Index] Failed to load transactions:', error);
      return [];
    }
  });
  const [finoraState, setFinoraState] = useState(() => {
    try {
      const state = loadFinoraState();
      // Ensure monthly_budget is set if we have a budget
      const currentBudget = loadBudget();
      if (currentBudget.total > 0 && !state.monthly_budget) {
        const updatedState = { ...state, monthly_budget: currentBudget.total };
        saveFinoraState(updatedState);
        return updatedState;
      }
      return state;
    } catch (error) {
      logger.error('[Index] Failed to load finora state:', error);
      return getDefaultFinoraState();
    }
  });
  const [conversationStarted, setConversationStarted] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastClaudeResponse, setLastClaudeResponse] = useState<ClaudeResponse>();
  const [lastTTSResponse, setLastTTSResponse] = useState<TTSResponse>();
  const [stt] = useState(() => new SpeechToText());
  const [sttSupport, setSttSupport] = useState<STTSupport>(SpeechToText.checkSupport());
  const [sttLanguage, setSttLanguage] = useState(stt.getConfig().language || 'en-US');
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('finora_voice') || 'rachel';
  });
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | "all">("all");
  const [showVisionResult, setShowVisionResult] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionAnalysisResult | null>(null);
  const [showDebateResult, setShowDebateResult] = useState(false);
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);
  const [demoMode, setDemoMode] = useState(() => {
    // Check if demo data is already loaded (Alex Chen profile with ~$1000 budget)
    const currentBudget = loadBudget();
    const currentTransactions = loadTransactions();
    return currentBudget.total >= 900 && currentBudget.total <= 1100 && currentTransactions.length > 20;
  });
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isDebating, setIsDebating] = useState(false);

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
        // Load current budget and transaction data for greeting
        const currentBudget = loadBudget();
        const currentTransactions = loadTransactions();

        // Safely calculate total spent with fallback
        let totalSpent = 0;
        if (currentBudget.spent) {
          totalSpent = Object.values(currentBudget.spent).reduce((a, b) => a + b, 0);
        }

        // Different greetings for demo mode vs normal mode
        let greetingText: string;

        if (demoMode) {
          // Demo mode: acknowledge existing spending data
          const topCategory = Object.entries(currentBudget.spent || {})
            .sort(([,a], [,b]) => b - a)[0];
          const topCategoryName = topCategory ? topCategory[0] : 'food';
          const topCategoryAmount = topCategory ? Math.round(topCategory[1]) : 0;

          greetingText = `Yooo what's good! I'm Finora, your AI budget bestie. I can see you already spent around $${Math.round(totalSpent)} this month out of your $${currentBudget.total || 1000} budget. Most of that went to ${topCategoryName} — about $${topCategoryAmount}. Wanna see where else your money's going, or should I suggest some cheap spots to check out? Just talk to me fr!`;
        } else {
          // Normal mode: ask for budget setup
          greetingText = `Hey! I'm Finora, your AI budget bestie who helps you manage your money without the stress. Before we get started, I need to know a couple things: What's your monthly budget? And how much have you already spent this month? Just tell me naturally, like you're texting a friend!`;
        }

        const ttsResponse = await textToSpeech(greetingText, selectedVoice, "cheerful");

          if (ttsResponse.audio_b64) {
            const audio = playAudioFromBase64(
              ttsResponse.audio_b64,
              ttsResponse.mime,
              () => {
                setVoiceState("idle");
                setCurrentAudio(null);
                setAudioAmplitude(0);
                // Mark intro as shown after greeting
                const updatedState = mergeStatePatch(finoraState, { introShown: true });
                setFinoraState(updatedState);
                saveFinoraState(updatedState);
                logger.log('[Finora] Intro shown, state updated');
              },
              (amplitude) => {
                setAudioAmplitude(amplitude);
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
  }, [finoraState, selectedVoice, demoMode]);

  // Refresh budget and transactions
  const refreshData = useCallback(() => {
    setBudget(loadBudget());
    setTransactions(loadTransactions());
  }, []);

  // Check for achievements
  const checkAchievements = useCallback(() => {
    const updatedBudget = loadBudget();
    const updatedTransactions = loadTransactions();
    const remaining = calculateRemainingTotal(updatedBudget);
    const totalSpent = Object.values(updatedBudget.spent).reduce((sum, val) => sum + val, 0);

    // Check food spending (Ramen Master)
    const foodSpent = updatedBudget.spent.food || 0;
    if (foodSpent < 20 && !localStorage.getItem('achievement_ramen_master')) {
      setCurrentAchievement('ramen_master');
      setConfettiTrigger(true);
      localStorage.setItem('achievement_ramen_master', 'true');
      setTimeout(() => setConfettiTrigger(false), 100);
    }

    // Check savings (No Cap Saver)
    const savingsPercent = updatedBudget.total > 0 ? (remaining / updatedBudget.total) * 100 : 0;
    if (savingsPercent >= 50 && !localStorage.getItem('achievement_no_cap_saver')) {
      setCurrentAchievement('no_cap_saver');
      setConfettiTrigger(true);
      localStorage.setItem('achievement_no_cap_saver', 'true');
      setTimeout(() => setConfettiTrigger(false), 100);
    }

    // Check if under budget (Budget King)
    if (remaining > 0 && totalSpent > 0 && !localStorage.getItem('achievement_budget_king')) {
      const daysLeft = Math.ceil((new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()));
      if (daysLeft <= 3 && remaining > 0) {
        setCurrentAchievement('budget_king');
        setConfettiTrigger(true);
        localStorage.setItem('achievement_budget_king', 'true');
        setTimeout(() => setConfettiTrigger(false), 100);
      }
    }
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

        // Show analysis panel if there is analysis data
        if (claudeResponse.analysis) {
          setShowAnalysis(true);
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

          // Handle initial spending report (when user says "I already spent $X")
          if (claudeResponse.state_patch.initial_spent !== undefined && claudeResponse.state_patch.initial_spent > 0) {
            const spentAmount = claudeResponse.state_patch.initial_spent;
            const category = claudeResponse.entities?.category || "other";

            // Add transaction for initial spending
            addTransaction({
              date: new Date().toISOString().split("T")[0],
              amount: spentAmount,
              merchant: "Initial spending",
              category: category as CategoryType,
              source: "voice",
              rawText: text,
            });

            refreshData();
            logger.log(`[Finora] Recorded initial spending: $${spentAmount} in ${category}`);
            toast.success(`Recorded $${spentAmount} already spent`);
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

          // Check for achievements after adding transaction
          checkAchievements();
        }

        setVoiceState("speaking");

        // Stop and cleanup any currently playing audio
        if (currentAudio) {
          logger.log('[Finora] Stopping previous audio before playing new one');
          currentAudio.pause();
          currentAudio.currentTime = 0;

          // Call cleanup if available to disconnect Web Audio nodes
          if ((currentAudio as any).cleanup) {
            (currentAudio as any).cleanup();
          }

          setCurrentAudio(null);
          setAudioAmplitude(0);
        }

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
                setAudioAmplitude(0);
              },
              (amplitude) => {
                setAudioAmplitude(amplitude);
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
    [budget, refreshData, finoraState, selectedVoice, currentAudio, checkAchievements]
  );

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

  // Handle camera capture and vision analysis
  const handleCameraCapture = useCallback(async () => {
    if (!conversationStarted) {
      toast.error('Please start the conversation first');
      return;
    }

    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use back camera on mobile

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        setIsAnalyzingImage(true);
        toast.info('Analyzing image...');

        // Convert image to base64
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const base64 = event.target?.result as string;
            const base64Data = base64.split(',')[1]; // Remove data:image/jpeg;base64, prefix
            const mimeType = file.type;

            logger.log('[Vision] Sending image to Claude Vision API...');

            // Call Vision API
            const { data, error } = await supabase.functions.invoke('claude-vision', {
              body: {
                image_b64: base64Data,
                mime_type: mimeType,
                budget: {
                  total: budget.total,
                  spent: budget.spent,
                  remaining_total: calculateRemainingTotal(budget),
                  days_left: Math.ceil((new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()))
                },
                image_type: 'general'
              }
            });

            if (error) {
              logger.error('[Vision] API error:', error);
              throw error;
            }

            logger.log('[Vision] Analysis result:', data);
            setVisionResult(data as VisionAnalysisResult);
            setShowVisionResult(true);
            setIsAnalyzingImage(false);

            // Speak the advice
            if (data.advice) {
              setVoiceState("speaking");
              try {
                const ttsResponse = await textToSpeech(data.advice, selectedVoice, "cheerful");
                if (ttsResponse.audio_b64) {
                  const audio = playAudioFromBase64(
                    ttsResponse.audio_b64,
                    ttsResponse.mime,
                    () => {
                      setVoiceState("idle");
                      setCurrentAudio(null);
                      setAudioAmplitude(0);
                    },
                    (amplitude) => {
                      setAudioAmplitude(amplitude);
                    }
                  );
                  setCurrentAudio(audio);
                } else {
                  setVoiceState("idle");
                }
              } catch (ttsError) {
                logger.error('[Vision] TTS failed:', ttsError);
                setVoiceState("idle");
              }
            }

            toast.success('Image analyzed!');
          } catch (error) {
            logger.error('[Vision] Processing failed:', error);
            toast.error('Failed to analyze image');
            setIsAnalyzingImage(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        logger.error('[Vision] Camera capture failed:', error);
        toast.error('Failed to capture image');
        setIsAnalyzingImage(false);
      }
    };

    input.click();
  }, [conversationStarted, budget, selectedVoice]);

  // Handle start debate
  const handleStartDebate = useCallback(async () => {
    if (!conversationStarted) {
      toast.error('Please start the conversation first');
      return;
    }

    // Prompt user for the question
    const question = prompt("What purchase are you considering? (e.g., 'Should I buy that $80 jacket?')");

    if (!question || question.trim() === '') {
      return;
    }

    try {
      setIsDebating(true);
      setShowDebateResult(true);
      setDebateResult(null); // Clear previous result
      toast.info('Finora is debating...');

      logger.log('[Debate] Starting debate for:', question);

      // Calculate budget info
      const totalSpent = Object.values(budget.spent).reduce((sum, val) => sum + val, 0);
      const remaining = calculateRemainingTotal(budget);
      const daysLeft = Math.ceil((new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()));

      // Call Finora Debates Edge Function
      const { data, error } = await supabase.functions.invoke('finora-debates', {
        body: {
          question: question,
          budget: {
            total: budget.total,
            totalSpent: totalSpent,
            remaining: remaining,
            daysLeft: daysLeft
          }
        }
      });

      if (error) {
        logger.error('[Debate] API error:', error);
        throw error;
      }

      logger.log('[Debate] Debate result:', data);
      setDebateResult(data as DebateResult);
      setIsDebating(false);
      toast.success('Debate complete!');
    } catch (error) {
      logger.error('[Debate] Failed:', error);
      toast.error('Failed to get debate results');
      setIsDebating(false);
      setShowDebateResult(false);
    }
  }, [conversationStarted, budget]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ignore if typing in an input field
      if (isTyping) return;

      // Space key - Toggle voice input (only when conversation started)
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        if (conversationStarted) {
          handleVoiceToggle();
        } else {
          toast.info("Start the conversation first!");
        }
        return;
      }

      // D - Debug panel
      if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setDebugOpen((prev) => !prev);
        return;
      }

      // S - Settings
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
        return;
      }

      // C - Camera/Vision
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        if (conversationStarted && !isAnalyzingImage) {
          handleCameraCapture();
        } else if (!conversationStarted) {
          toast.info("Start the conversation first!");
        }
        return;
      }

      // B - Debates
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        if (conversationStarted && !isDebating) {
          handleStartDebate();
        } else if (!conversationStarted) {
          toast.info("Start the conversation first!");
        }
        return;
      }

      // H or ? - Help/Shortcuts
      if (e.key === "h" || e.key === "H" || e.key === "?") {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
        return;
      }

      // Escape - Close all panels/stop listening
      if (e.key === "Escape") {
        e.preventDefault();
        if (voiceState === "listening") {
          stt.stop();
          setVoiceState("idle");
          toast.info("Stopped listening");
        }
        if (settingsOpen) setSettingsOpen(false);
        if (debugOpen) setDebugOpen(false);
        if (showShortcutsHelp) setShowShortcutsHelp(false);
        if (showTransactionHistory) setShowTransactionHistory(false);
        if (showVisionResult) setShowVisionResult(false);
        if (showDebateResult) setShowDebateResult(false);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    voiceState,
    stt,
    settingsOpen,
    debugOpen,
    showShortcutsHelp,
    showTransactionHistory,
    showVisionResult,
    showDebateResult,
    conversationStarted,
    isAnalyzingImage,
    isDebating,
    handleVoiceToggle,
    handleCameraCapture,
    handleStartDebate
  ]);

  // Handle delete transaction
  const handleDeleteTransaction = useCallback((id: string) => {
    deleteTransaction(id);
    refreshData();
    toast.success("Transaction deleted!");
  }, [refreshData]);

  // Handle category click - open transaction history filtered by category
  const handleCategoryClick = useCallback((category: CategoryType) => {
    setSelectedCategory(category);
    setShowTransactionHistory(true);
    toast.success(`Viewing ${category} transactions`);
  }, []);

  // Handle add expense from recommendation
  const handleAddExpenseFromRecommendation = useCallback((name: string, amount: number, category: string) => {
    addTransaction({
      date: new Date().toISOString().split("T")[0],
      amount,
      merchant: name,
      category: category as CategoryType,
      source: "manual",
    });
    refreshData();
    toast.success(`Added ${name} expense!`);
    checkAchievements();
  }, [refreshData, checkAchievements]);

  // Handle export expenses to share with friends
  const handleExportData = useCallback(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Filter transactions for current month only
    const monthTransactions = loadTransactions().filter((t) => {
      const transactionDate = new Date(t.date);
      return transactionDate.getMonth() === currentMonth &&
             transactionDate.getFullYear() === currentYear;
    });

    const data = {
      type: "finora_expenses_share",
      version: "1.0",
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      exportDate: new Date().toISOString(),
      totalExpenses: monthTransactions.reduce((sum, t) => sum + t.amount, 0),
      transactionCount: monthTransactions.length,
      transactions: monthTransactions,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finora-expenses-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${monthTransactions.length} expenses to share!`);
  }, []);

  // Handle import expenses from friends
  const handleImportData = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);

          // Check if it's a Finora expenses share file
          if (data.type === "finora_expenses_share" && data.transactions) {
            const existingTransactions = loadTransactions();

            // Merge imported transactions with existing ones
            const mergedTransactions = [...existingTransactions, ...data.transactions];

            // Remove duplicates based on date, amount, and merchant
            const uniqueTransactions = mergedTransactions.filter((transaction, index, self) =>
              index === self.findIndex((t) => (
                t.date === transaction.date &&
                t.amount === transaction.amount &&
                t.merchant === transaction.merchant
              ))
            );

            saveTransactions(uniqueTransactions);
            refreshData();

            const importedCount = uniqueTransactions.length - existingTransactions.length;
            toast.success(`Imported ${importedCount} expenses from ${data.month}!`);
          } else {
            toast.error("Invalid Finora expenses file");
          }
        } catch (error) {
          toast.error("Invalid file format");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [refreshData]);

  // Check support on mount
  useEffect(() => {
    const support = SpeechToText.checkSupport();
    setSttSupport(support);
  }, []);

  // Show welcome message if demo data was just loaded
  useEffect(() => {
    if (budget.total > 0 && transactions.length > 0 && demoMode) {
      logger.log('[Demo] App loaded with demo data:', {
        budget: budget.total,
        transactions: transactions.length
      });

      // Show welcome toast on first load of demo mode
      const hasShownWelcome = sessionStorage.getItem('finora_welcome_shown');
      if (!hasShownWelcome) {
        toast.success(`Demo mode active! Budget: $${budget.total}/month with ${transactions.length} realistic transactions`, {
          duration: 5000
        });
        sessionStorage.setItem('finora_welcome_shown', 'true');
      }
    }
  }, []); // Only run once on mount

  // Handle demo mode toggle
  const handleDemoModeToggle = useCallback((enableDemo: boolean) => {
    logger.log(`[Demo Mode] Switching to ${enableDemo ? 'DEMO' : 'NORMAL'} mode`);

    // Stop any active conversation
    if (voiceState === "listening") {
      stt.stop();
      setVoiceState("idle");
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }

    if (enableDemo) {
      // Load demo data
      forceLoadDemoData();
      toast.success('Demo mode activated! Loaded realistic student budget with 28 transactions', {
        duration: 4000
      });
    } else {
      // Clear data for normal mode
      clearAllData();
      toast.info('Normal mode activated! Ready for fresh start', {
        duration: 3000
      });
    }

    // Reset conversation state to show new greeting
    setConversationStarted(false);
    const freshFinoraState = getDefaultFinoraState();
    setFinoraState(freshFinoraState);
    saveFinoraState(freshFinoraState);

    // Update state and refresh
    setDemoMode(enableDemo);
    refreshData();
  }, [voiceState, stt, currentAudio, refreshData]);

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

  // Handle log expense from vision
  const handleLogVisionExpense = useCallback(() => {
    if (!visionResult) return;

    // Add all items as transactions
    visionResult.items.forEach((item) => {
      addTransaction({
        date: new Date().toISOString().split("T")[0],
        amount: item.price,
        merchant: item.name,
        category: item.category || "other",
        source: "manual",
      });
    });

    refreshData();
    toast.success(`Logged ${visionResult.items.length} item(s)!`);
    setShowVisionResult(false);
    setVisionResult(null);
    checkAchievements();
  }, [visionResult, refreshData, checkAchievements]);

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
        <p className="text-lg md:text-xl text-white/80 font-inter mb-2">
          Talk. Laugh. Save. Repeat. Finora makes adulting kinda fun.
        </p>
        <p className="text-sm text-white/60 font-inter mb-4">
          Your AI budget bestie who gets it. Just press the mic and start talking.
        </p>
      </motion.div>

      {/* Quick Stats Dashboard - shows when budget is set (demo data or user data) */}
      {budget.total > 0 && (
        <>
          <QuickStatsDashboard budget={budget} />
          <BudgetProgressIndicators budget={budget} onCategoryClick={handleCategoryClick} />
        </>
      )}

      {/* 3D Character - shows when conversation started */}
      {conversationStarted && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative w-full max-w-5xl px-4 flex items-center justify-center"
        >
          {/* Recommendations Panel - appears to the left of character */}
          <AnimatePresence>
            {(() => {
              return showRecommendations && lastClaudeResponse?.recs && lastClaudeResponse.recs.length > 0 ? (
                <RecommendationsPanel
                  recommendations={lastClaudeResponse.recs}
                  onClose={() => setShowRecommendations(false)}
                  onAddExpense={handleAddExpenseFromRecommendation}
                />
              ) : null;
            })()}
          </AnimatePresence>

          {/* Spending Analysis Panel - appears to the right of character */}
          <AnimatePresence>
            {(() => {
              try {
                return showAnalysis && lastClaudeResponse?.analysis ? (
                  <SpendingAnalysisPanel
                    analysis={lastClaudeResponse.analysis}
                    onClose={() => setShowAnalysis(false)}
                  />
                ) : null;
              } catch (error) {
                logger.error('[Index] SpendingAnalysisPanel error:', error);
                return null;
              }
            })()}
          </AnimatePresence>

          {/* Character in center */}
          <div className="w-full max-w-md">
            <AnimatedFinoraCharacter
              voiceState={voiceState}
              gesture={lastClaudeResponse?.gesture}
              audioAmplitude={audioAmplitude}
            />
          </div>
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
          {/* Demo Mode Toggle Buttons */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => handleDemoModeToggle(true)}
              disabled={demoMode}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300
                ${demoMode
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg border-2 border-white/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 border-2 border-white/20'
                }`}
            >
              🎬 Demo Mode
            </button>
            <button
              onClick={() => handleDemoModeToggle(false)}
              disabled={!demoMode}
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-300
                ${!demoMode
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg border-2 border-white/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 border-2 border-white/20'
                }`}
            >
              👤 Normal Mode
            </button>
          </div>

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
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-white/60 text-center max-w-lg px-4 space-y-2"
          >
            <p className="font-medium">
              {demoMode
                ? '🎬 Demo mode active - showing realistic student budget with existing transactions'
                : '👤 Normal mode - ready for your fresh start'}
            </p>
            <p>
              Press Start to activate voice and begin chatting with Finora
            </p>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-6 mb-8"
        >
          {/* Mic, Camera, and Debate Buttons Row */}
          <div className="flex items-center gap-6">
            {/* Microphone Button */}
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

            {/* Camera Button */}
            <motion.button
              onClick={handleCameraCapture}
              disabled={isAnalyzingImage || voiceState === "thinking" || voiceState === "speaking"}
              className={`
                relative w-24 h-24 md:w-32 md:h-32 rounded-full backdrop-blur-xl border-2 border-white/30
                flex items-center justify-center
                transition-all duration-300 ease-out
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:scale-105 active:scale-95
                bg-gradient-to-br from-cyan-500 to-blue-600
                shadow-[0_0_40px_rgba(6,182,212,0.4)]
                hover:shadow-[0_0_60px_rgba(6,182,212,0.6)]
              `}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              {isAnalyzingImage ? (
                <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-white animate-spin" />
              ) : (
                <Camera className="w-10 h-10 md:w-12 md:h-12 text-white" />
              )}
            </motion.button>

            {/* Debate Button */}
            <motion.button
              onClick={handleStartDebate}
              disabled={isDebating || voiceState === "thinking" || voiceState === "speaking"}
              className={`
                relative w-24 h-24 md:w-32 md:h-32 rounded-full backdrop-blur-xl border-2 border-white/30
                flex items-center justify-center
                transition-all duration-300 ease-out
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:scale-105 active:scale-95
                bg-gradient-to-br from-purple-500 to-pink-600
                shadow-[0_0_40px_rgba(168,85,247,0.4)]
                hover:shadow-[0_0_60px_rgba(168,85,247,0.6)]
              `}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              {isDebating ? (
                <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-white animate-spin" />
              ) : (
                <Scale className="w-10 h-10 md:w-12 md:h-12 text-white" />
              )}
            </motion.button>
          </div>

          {/* Status pill */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20"
          >
            <p className="text-sm font-medium text-white/90">
              {voiceState === "idle" && !isAnalyzingImage && !isDebating && "Voice activated — talk to Finora anytime now!"}
              {voiceState === "listening" && "Listening..."}
              {voiceState === "thinking" && "Thinking..."}
              {voiceState === "speaking" && "Speaking..."}
              {isAnalyzingImage && "Analyzing image..."}
              {isDebating && "Finora is debating..."}
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

          {/* Export Button - Share expenses with friends */}
          <motion.button
            onClick={handleExportData}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-green-600 to-emerald-600
              text-white font-bold text-sm
              hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]
              transition-all duration-300 ease-out
              hover:scale-105 active:scale-95
              border border-white/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Share your expenses with friends"
          >
            <span className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Share Expenses
            </span>
          </motion.button>

          {/* Import Button - Import friend's expenses */}
          <motion.button
            onClick={handleImportData}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600
              text-white font-bold text-sm
              hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]
              transition-all duration-300 ease-out
              hover:scale-105 active:scale-95
              border border-white/20"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Import friend's expenses"
          >
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Import Expenses
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

      {/* Transaction History Button */}
      {conversationStarted && transactions.length > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          onClick={() => setShowTransactionHistory(!showTransactionHistory)}
          className="absolute top-4 right-20 p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
        >
          <History className="w-5 h-5 text-white/70" />
        </motion.button>
      )}

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
      
      {/* Transaction History Panel */}
      {showTransactionHistory && (
        <TransactionHistoryPanel
          transactions={transactions}
          onDeleteTransaction={handleDeleteTransaction}
          onClose={() => {
            setShowTransactionHistory(false);
            setSelectedCategory("all");
          }}
          initialCategoryFilter={selectedCategory}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* Confetti Celebration */}
      <ConfettiCelebration trigger={confettiTrigger} />

      {/* Achievement Badge */}
      {currentAchievement && (
        <AchievementBadge
          achievementId={currentAchievement}
          onClose={() => setCurrentAchievement(null)}
        />
      )}

      {/* Vision Result Panel */}
      <AnimatePresence>
        {showVisionResult && visionResult && (
          <VisionResultPanel
            result={visionResult}
            onClose={() => {
              setShowVisionResult(false);
              setVisionResult(null);
            }}
            onLogExpense={handleLogVisionExpense}
          />
        )}
      </AnimatePresence>

      {/* Finora Debates Panel */}
      {showDebateResult && (
        <FinoraDebatesPanel
          result={debateResult}
          onClose={() => {
            setShowDebateResult(false);
            setDebateResult(null);
          }}
          isLoading={isDebating}
        />
      )}

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
    </div>
  );
};

export default Index;
