import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Loader2, Volume2, Settings, Hand, Sparkles, History, Share2, Camera, Scale, Home } from "lucide-react";
import DebugPanel from "@/components/DebugPanel";
import VoiceSettings from "@/components/VoiceSettings";
import { AnimatedFinoraCharacter } from "@/components/AnimatedFinoraCharacter";
import { ConfettiCelebration } from "@/components/ConfettiCelebration";
import { AchievementBadge } from "@/components/AchievementBadge";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { SpendingAnalysisPanel } from "@/components/SpendingAnalysisPanel";
import { QuickStatsDashboard } from "@/components/QuickStatsDashboard";
import { TransactionHistoryPanel } from "@/components/TransactionHistoryPanel";
import { SpendingReportPanel } from "@/components/SpendingReportPanel";
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
  clearNormalModeData,
  getDefaultBudget,
  calculateRemainingTotal,
  saveBudget,
  saveTransactions,
  forceLoadDemoData,
  setStorageMode
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
  const [budget, setBudget] = useState(() => loadBudget());
  const [transactions, setTransactions] = useState(() => loadTransactions());
  const [finoraState, setFinoraState] = useState(() => {
    const state = loadFinoraState();
    const currentBudget = loadBudget();

    // Sync monthly_budget with actual budget
    if (currentBudget.total > 0 && state.monthly_budget !== currentBudget.total) {
      const updatedState = { ...state, monthly_budget: currentBudget.total };
      saveFinoraState(updatedState);
      return updatedState;
    }

    return state;
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
  const [showSpendingReport, setShowSpendingReport] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [currentAchievement, setCurrentAchievement] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | "all">("all");
  const [showVisionResult, setShowVisionResult] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionAnalysisResult | null>(null);
  const [showDebateResult, setShowDebateResult] = useState(false);
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);
  const [demoMode, setDemoMode] = useState(() => {
    // Start in normal mode by default
    // We'll check and potentially switch in useEffect
    return false;
  });
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [isDebating, setIsDebating] = useState(false);
  const [showCameraOptions, setShowCameraOptions] = useState(false);
  const [showCameraView, setShowCameraView] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showDebateInput, setShowDebateInput] = useState(false);
  const [debateQuestion, setDebateQuestion] = useState("");
  const [showModeSelection, setShowModeSelection] = useState(() => {
    // Show landing page ONLY if mode has never been selected
    const modeSelected = localStorage.getItem('finora_mode_selected');
    return !modeSelected;
  });

  // Handle voice change
  const handleVoiceChange = useCallback((voice: string) => {
    setSelectedVoice(voice);
    localStorage.setItem('finora_voice', voice);
    toast.success(`Voice changed to ${voice}`);
  }, []);

  // Show onboarding screen handler
  const handleShowOnboarding = useCallback(() => {
    localStorage.removeItem('finora_mode_selected');
    setShowModeSelection(true);
    setSettingsOpen(false);
    toast.success('Showing onboarding screen');
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

        const claudeResponse = await getIntent(text, budget, venuesData, finoraState, demoMode);
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

          // Handle category breakdown (when user breaks down spending by category)
          if (claudeResponse.state_patch.category_breakdown) {
            const breakdown = claudeResponse.state_patch.category_breakdown;
            let totalAdded = 0;

            // Calculate total from breakdown
            const breakdownTotal = Object.values(breakdown).reduce((sum, val) => sum + (val || 0), 0);

            // Check if there's a recent "Initial spending" in "other" category that matches
            const recentTransactions = loadTransactions();
            const recentInitialSpending = recentTransactions.find(tx =>
              tx.merchant === "Initial spending" &&
              tx.category === "other" &&
              tx.amount === breakdownTotal
            );

            // Remove the old "other" transaction if it exists (user is now breaking it down)
            if (recentInitialSpending) {
              deleteTransaction(recentInitialSpending.id);
              logger.log(`[Finora] Removed old "other" transaction, replacing with category breakdown`);
            }

            // Add a transaction for each category with spending
            Object.entries(breakdown).forEach(([category, amount]) => {
              if (amount && amount > 0) {
                addTransaction({
                  date: new Date().toISOString().split("T")[0],
                  amount: amount,
                  merchant: `Initial ${category} spending`,
                  category: category as CategoryType,
                  source: "voice",
                  rawText: text,
                });
                totalAdded += amount;
                logger.log(`[Finora] Recorded initial spending: $${amount} in ${category}`);
              }
            });

            refreshData();
            toast.success(`Recorded $${totalAdded} across ${Object.keys(breakdown).length} categories`);
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
              // User manually stopped - process the transcript
              logger.log('[Voice] Final transcript received:', text);
              processTranscript(text);
            } else {
              // Interim results - just show in UI (if you want to display it)
              logger.log('[Voice] Interim transcript:', text);
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
      // User pressed mic again - stop listening and process
      toast.info("Processing...");
      stt.stop(); // This will trigger the callback with isFinal=true
    }
  }, [conversationStarted, voiceState, stt, processTranscript]);

  // Process image for vision analysis
  const processImageForVision = useCallback(async (file: File) => {
    try {
      setIsAnalyzingImage(true);
      toast.info('Analyzing image...');

      // Convert image to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64 = event.target?.result as string;
          const base64Data = base64.split(',')[1];
          const mimeType = file.type;

          logger.log('[Vision] Sending image to Claude Vision API...');

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

          if (data.advice) {
            setVoiceState("speaking");
            try {
              const ttsResponse: TTSResponse = await textToSpeech(data.advice, selectedVoice, "cheerful");
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
                setLastTTSResponse(ttsResponse);
              } else {
                setVoiceState("idle");
              }
            } catch (error) {
              logger.error('[Vision] TTS error:', error);
              setVoiceState("idle");
            }
          }
        } catch (error) {
          logger.error('[Vision] Processing error:', error);
          toast.error('Failed to analyze image. Please try again.');
          setIsAnalyzingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      logger.error('[Vision] Error:', error);
      toast.error('Failed to process image');
      setIsAnalyzingImage(false);
    }
  }, [budget, selectedVoice]);

  // Handle upload file option
  const handleUploadFile = useCallback(() => {
    setShowCameraOptions(false);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      await processImageForVision(file);
    };

    input.click();
  }, [processImageForVision]);

  // Handle take photo option
  const handleTakePhoto = useCallback(async () => {
    setShowCameraOptions(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });

      setCameraStream(stream);
      setShowCameraView(true);
      toast.success('Camera activated! Position your receipt and click Capture');
    } catch (error) {
      logger.error('[Camera] Failed to access camera:', error);
      toast.error('Failed to access camera. Please check permissions.');
    }
  }, []);

  // Capture photo from camera stream
  const handleCapturePhoto = useCallback(() => {
    if (!cameraStream) return;

    const video = document.getElementById('camera-video') as HTMLVideoElement;
    if (!video) return;

    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0);

      // Convert to blob and process
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });

          // Stop camera
          cameraStream.getTracks().forEach(track => track.stop());
          setCameraStream(null);
          setShowCameraView(false);

          // Process image
          await processImageForVision(file);
        }
      }, 'image/jpeg', 0.9);
    }
  }, [cameraStream, processImageForVision]);

  // Close camera view
  const handleCloseCameraView = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraView(false);
  }, [cameraStream]);

  // Handle camera capture button click
  const handleCameraCapture = useCallback(() => {
    if (!conversationStarted) {
      toast.error('Please start the conversation first');
      return;
    }
    setShowCameraOptions(true);
  }, [conversationStarted]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Handle start debate - show input dialog
  const handleStartDebate = useCallback(() => {
    if (!conversationStarted) {
      toast.error('Please start the conversation first');
      return;
    }
    setShowDebateInput(true);
  }, [conversationStarted]);

  // Handle debate submission
  const handleDebateSubmit = useCallback(async () => {
    const question = debateQuestion.trim();

    if (!question) {
      toast.error('Please enter a question');
      return;
    }

    setShowDebateInput(false);

    try {
      setIsDebating(true);
      setShowDebateResult(true);
      setDebateResult(null);
      toast.info('Finora is debating...');

      logger.log('[Debate] Starting debate for:', question);

      const totalSpent = Object.values(budget.spent).reduce((sum, val) => sum + val, 0);
      const remaining = calculateRemainingTotal(budget);
      const daysLeft = Math.ceil((new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()));

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

        const errorMsg = error.message || JSON.stringify(error);
        const errorStr = JSON.stringify(error);

        // Check for deployment errors
        if (errorMsg.includes('FunctionsRelayError') || errorMsg.includes('Not Found') || errorMsg.includes('404') ||
            errorStr.includes('FunctionsRelayError') || errorStr.includes('Not Found') || errorStr.includes('404') ||
            errorMsg.includes('non-2xx') || errorMsg.includes('non 2xx') || errorMsg.includes('2XX') ||
            errorMsg.includes('FunctionsHttpError')) {
          toast.error('🚨 DEPLOY REQUIRED: supabase functions deploy finora-debates', {
            duration: 12000
          });
        } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
          toast.error('Network error. Check your internet connection.', {
            duration: 5000
          });
        } else if (errorMsg.includes('ANTHROPIC_API_KEY')) {
          toast.error('Missing API key. Contact admin.', {
            duration: 6000
          });
        } else {
          // Default to deployment error message
          toast.error('🚨 DEPLOY REQUIRED: supabase functions deploy finora-debates', {
            duration: 12000
          });
        }
        throw error;
      }

      logger.log('[Debate] Debate result:', data);
      setDebateResult(data as DebateResult);
      setIsDebating(false);

      // Finora speaks the verdict!
      if (data.verdict && data.verdict.reasoning) {
        setVoiceState("speaking");
        try {
          const ttsResponse = await textToSpeech(data.verdict.reasoning, selectedVoice, "cheerful");
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
          logger.error('[Debate] TTS failed:', ttsError);
          setVoiceState("idle");
        }
      }

      toast.success('Debate complete!');
      setDebateQuestion(''); // Clear input
    } catch (error) {
      logger.error('[Debate] Failed:', error);
      toast.error('Failed to get debate results');
      setIsDebating(false);
      setShowDebateResult(false);
    }
  }, [debateQuestion, budget, selectedVoice]);

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

  // Handle showing spending report
  const handleShowSpendingReport = useCallback(() => {
    setShowSpendingReport(true);
    toast.success('📊 Generating your spending report...');
  }, []);

  // Check support on mount
  useEffect(() => {
    const support = SpeechToText.checkSupport();
    setSttSupport(support);
  }, []);

  // Initialize demo mode state on mount to match storage mode
  useEffect(() => {
    // Storage mode is already set in budget.ts from localStorage
    // We just need to sync the demoMode state
    const savedMode = localStorage.getItem('finora_current_mode');
    const isDemo = savedMode === 'demo';

    logger.log(`[Init] Syncing to ${isDemo ? 'DEMO' : 'NORMAL'} mode`);
    setDemoMode(isDemo);

    // Ensure demo data exists if in demo mode
    if (isDemo) {
      const demoBudget = loadBudget();
      if (demoBudget.total === 0) {
        forceLoadDemoData();
      }
    } else {
      // SAFETY: If in normal mode, make sure we don't have $1000 demo budget
      const normalBudget = loadBudget();
      if (normalBudget.total === 1000) {
        logger.warn('[Init] Found demo data in normal mode! Clearing...');
        clearNormalModeData();
      }
    }

    refreshData();
  }, []); // Only run once on mount

  // Handle initial mode selection (onboarding)
  const handleModeSelection = useCallback((enableDemo: boolean) => {
    logger.log(`[Onboarding] Selected ${enableDemo ? 'DEMO' : 'NORMAL'} mode`);

    // Set storage mode FIRST
    setStorageMode(enableDemo ? "demo" : "normal");

    if (enableDemo) {
      // Load demo data for demo mode
      forceLoadDemoData();
    } else {
      // IMPORTANT: Clear normal mode to ensure fresh start
      clearNormalModeData();
    }

    // Mark that mode has been selected
    localStorage.setItem('finora_mode_selected', 'true');

    // Update state - these are INSTANT, no lag
    setDemoMode(enableDemo);
    setShowModeSelection(false);
    setConversationStarted(true); // Mic button shows immediately!
    refreshData();

    // Do async operations in background WITHOUT blocking UI
    setTimeout(async () => {
      try {
        // Unlock audio
        unlockAudio();

        // Request mic permission
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          setSttSupport(prev => ({ ...prev, hasMicPermission: true }));
        } catch (error) {
          logger.error('[Onboarding] Mic permission denied:', error);
          toast.error('Microphone access needed. Click the mic button when ready.', { duration: 5000 });
          setVoiceState("idle");
          return;
        }

        // Wait a moment for UI to settle
        await new Promise(resolve => setTimeout(resolve, 300));

        // Play auto-greeting
        setVoiceState("speaking");

        const currentBudget = loadBudget();
        let greetingText: string;

        if (enableDemo) {
          const totalSpent = Object.values(currentBudget.spent || {}).reduce((a, b) => a + b, 0);
          greetingText = `Yooo what's good! I'm Finora, your AI budget bestie. I can see you already spent around $${Math.round(totalSpent)} this month out of your $${currentBudget.total || 1000} budget. Wanna see where your money's going, or should I suggest some cheap spots to check out? Just talk to me fr!`;
        } else {
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
            },
            (amplitude) => setAudioAmplitude(amplitude)
          );
          setCurrentAudio(audio);
          setLastTTSResponse(ttsResponse);
          setFinoraState(prev => ({ ...prev, introShown: true }));
        } else {
          setVoiceState("idle");
          toast.error('Audio generation failed. Try using the mic!');
        }

        toast.success(enableDemo ? '🎬 Welcome to Finora Demo!' : '👤 Welcome to Finora!', {
          duration: 3000
        });
      } catch (error) {
        logger.error('[Onboarding] Failed:', error);
        setVoiceState("idle");
        toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, {
          duration: 6000
        });
      }
    }, 100);
  }, [refreshData, selectedVoice]);

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

    // Switch storage mode first
    setStorageMode(enableDemo ? "demo" : "normal");

    if (enableDemo) {
      // Load demo data - ensure demo data exists
      forceLoadDemoData();
      toast.success('Demo mode activated! Loaded Alex Chen\'s student budget', {
        duration: 4000
      });
    } else {
      // Switch to normal mode - load normal mode data (separate from demo)
      toast.info('Normal mode activated! Your personal data loaded', {
        duration: 3000
      });
    }

    // Reset conversation state to show new greeting
    setConversationStarted(false);
    const freshFinoraState = getDefaultFinoraState();
    setFinoraState(freshFinoraState);
    saveFinoraState(freshFinoraState);

    // Update state and refresh with new mode's data
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

  // Handle reset (only for Normal Mode)
  const handleReset = useCallback(async () => {
    logger.log('[Finora] Resetting Normal Mode data...');

    // First end any active conversation
    if (voiceState === "listening") {
      stt.stop();
    }
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }

    // Clear only normal mode data (not demo data)
    clearNormalModeData();
    localStorage.removeItem("finora_state");

    // Reset to clean normal mode state (no budget, no transactions)
    logger.log('[Finora] Resetting to clean normal mode state...');
    const loadedBudget = loadBudget();
    const loadedTransactions = loadTransactions();

    // Reset finora state to clean normal mode
    const freshFinoraState = getDefaultFinoraState();
    freshFinoraState.introShown = false; // Reset intro so user gets greeted again
    saveFinoraState(freshFinoraState);

    setFinoraState(freshFinoraState);
    setBudget(loadedBudget);
    setTransactions(loadedTransactions);
    setVoiceState("idle");
    setConversationStarted(false); // Reset conversation so "Start Conversation" button shows
    setLastClaudeResponse(undefined);

    logger.log('[Finora] Reset complete - fresh Normal Mode state:', freshFinoraState);

    setShowResetDialog(false);
    toast.success("Normal Mode reset! Press 'Start Conversation' to begin again.");
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

  const getStateStyle = () => {
    switch (voiceState) {
      case "listening":
        return {
          background: "linear-gradient(to bottom right, rgb(34, 197, 94), rgb(16, 185, 129))",
          boxShadow: "0 0 60px rgba(34, 197, 94, 0.6)"
        };
      case "thinking":
        return {
          background: "linear-gradient(to bottom right, rgb(234, 179, 8), rgb(249, 115, 22))",
          boxShadow: "0 0 60px rgba(234, 179, 8, 0.6)"
        };
      case "speaking":
        return {
          background: "linear-gradient(to bottom right, rgb(59, 130, 246), rgb(147, 51, 234))",
          boxShadow: "0 0 60px rgba(59, 130, 246, 0.6)"
        };
      default:
        return {
          background: "linear-gradient(to bottom right, rgb(124, 58, 237), rgb(147, 51, 234))",
          boxShadow: "0 0 60px rgba(139, 92, 246, 0.6)"
        };
    }
  };

  // Mode Selection Screen
  if (showModeSelection) {
    return (
      <div className="relative w-screen min-h-screen overflow-hidden flex items-center justify-center font-sora bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900">
        {/* Animated Background Orbs */}
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-6xl mx-4 p-8 md:p-12"
        >
          {/* Logo and Title */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
            className="text-center mb-10"
          >
            <motion.h1
              className="text-7xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                backgroundSize: "200% 200%"
              }}
            >
              Finora
            </motion.h1>
            <motion.p
              className="text-2xl md:text-3xl text-purple-200 mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Your Gen Z Budget Bestie 💜
            </motion.p>
          </motion.div>

          {/* Intro */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-2 border-purple-500/30 rounded-3xl p-8 md:p-10 mb-10 backdrop-blur-xl shadow-2xl"
          >
            <p className="text-white/95 text-xl md:text-2xl leading-relaxed text-center mb-6 font-medium">
              Meet Finora — your <span className="font-bold text-purple-300 bg-purple-500/20 px-2 py-1 rounded">AI-powered budget companion</span> who actually gets you.
            </p>
            <p className="text-white/80 text-lg leading-relaxed text-center mb-8">
              She's funny, savage when needed, and keeps it 100% real about your spending.
              No boring spreadsheets, no judgment — just real talk and smart advice.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: "🎤", text: "Voice tracking" },
                { icon: "📸", text: "Receipt scanning" },
                { icon: "⚖️", text: "Smart debates" },
                { icon: "✨", text: "Gen Z vibes" },
              ].map((feature, i) => (
                <motion.div
                  key={feature.text}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.1, type: "spring", stiffness: 200 }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2.5 flex items-center gap-2 hover:bg-white/15 transition-colors cursor-default"
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="text-white/90 font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Mode Selection */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-3xl font-bold text-white text-center mb-8 flex items-center justify-center gap-3">
              <span>Choose Your Experience</span>
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                ✨
              </motion.span>
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Demo Mode */}
              <motion.button
                onClick={() => handleModeSelection(true)}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9, type: "spring", stiffness: 100 }}
                className="relative group p-8 md:p-10 rounded-3xl bg-gradient-to-br from-blue-600/40 to-cyan-600/40
                  border-2 border-blue-500/50 hover:border-blue-400/70
                  backdrop-blur-xl shadow-2xl
                  transition-all duration-300
                  hover:shadow-[0_0_50px_rgba(59,130,246,0.5)]
                  overflow-hidden"
                whileHover={{ scale: 1.03, y: -8 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative text-left">
                  <div className="flex items-center gap-4 mb-5">
                    <motion.div
                      className="p-4 bg-blue-500/30 rounded-2xl"
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Sparkles className="w-8 h-8 text-blue-300" />
                    </motion.div>
                    <h3 className="text-3xl font-bold text-white">Demo Mode</h3>
                  </div>
                  <p className="text-white/90 text-lg mb-2 leading-relaxed">
                    Explore with <span className="font-bold text-blue-300">Alex Chen's</span> realistic student budget
                  </p>
                  <p className="text-white/70 mb-6 leading-relaxed">
                    See Finora in action with{" "}
                    <span className="font-bold text-blue-300">$1,000/month</span> and{" "}
                    <span className="font-bold text-blue-300">28 real transactions</span>
                  </p>
                  <div className="flex items-center gap-2 text-blue-300 font-bold text-lg group-hover:gap-4 transition-all">
                    Try Demo Now
                    <motion.span
                      className="text-2xl"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </div>
                </div>
              </motion.button>

              {/* Normal Mode */}
              <motion.button
                onClick={() => handleModeSelection(false)}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9, type: "spring", stiffness: 100 }}
                className="relative group p-8 md:p-10 rounded-3xl bg-gradient-to-br from-purple-600/40 to-pink-600/40
                  border-2 border-purple-500/50 hover:border-purple-400/70
                  backdrop-blur-xl shadow-2xl
                  transition-all duration-300
                  hover:shadow-[0_0_50px_rgba(168,85,247,0.5)]
                  overflow-hidden"
                whileHover={{ scale: 1.03, y: -8 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative text-left">
                  <div className="flex items-center gap-4 mb-5">
                    <motion.div
                      className="p-4 bg-purple-500/30 rounded-2xl"
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Hand className="w-8 h-8 text-purple-300" />
                    </motion.div>
                    <h3 className="text-3xl font-bold text-white">Normal Mode</h3>
                  </div>
                  <p className="text-white/90 text-lg mb-2 leading-relaxed">
                    Start fresh with <span className="font-bold text-purple-300">your own budget</span>
                  </p>
                  <p className="text-white/70 mb-6 leading-relaxed">
                    Finora will guide you through setup and help you track spending in{" "}
                    <span className="font-bold text-purple-300">real-time</span>
                  </p>
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-lg group-hover:gap-4 transition-all">
                    Start Tracking
                    <motion.span
                      className="text-2xl"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      →
                    </motion.span>
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.div>

          {/* Footer Note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-center text-white/50 text-sm mt-10"
          >
            💡 You can switch between modes anytime from settings
          </motion.p>
        </motion.div>
      </div>
    );
  }

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
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <QuickStatsDashboard budget={budget} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <BudgetProgressIndicators budget={budget} onCategoryClick={handleCategoryClick} />
          </motion.div>
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

          {/* Character in center - with parallax effect */}
          <motion.div
            className="w-full max-w-md"
            initial={{ y: 0 }}
            animate={{ y: [0, -10, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <AnimatedFinoraCharacter
              voiceState={voiceState}
              gesture={lastClaudeResponse?.gesture}
              audioAmplitude={audioAmplitude}
            />
          </motion.div>
        </motion.div>
      )}

      {/* Start Conversation Button - Shows after ending/resetting conversation */}
      {!conversationStarted && (
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
          <p className="text-white/60 text-sm">
            {demoMode ? '🎬 Demo Mode Active' : '👤 Normal Mode Active'}
          </p>
        </motion.div>
      )}

      {/* Mic, Camera, and Debate Buttons - Active after conversation started */}
      {conversationStarted && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-6 mb-8"
        >
          {/* Mic, Camera, and Debate Buttons Row - Enhanced */}
          <motion.div
            className="flex items-center gap-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Microphone Button */}
            <motion.button
              onClick={handleVoiceToggle}
              disabled={voiceState === "thinking" || voiceState === "speaking"}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={
                voiceState === "listening"
                  ? {
                      scale: [1, 1.05, 1],
                      opacity: 1,
                      transition: { repeat: Infinity, duration: 1.5 },
                    }
                  : { scale: 1, opacity: 1 }
              }
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.08, y: -5 }}
              style={getStateStyle()}
              className="
                relative w-32 h-32 md:w-40 md:h-40 rounded-full backdrop-blur-xl border-2 border-white/30
                flex items-center justify-center
                transition-all duration-300 ease-out
                disabled:opacity-70 disabled:cursor-not-allowed
                active:scale-95
              "
              whileTap={{ scale: 0.95 }}
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
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.08, y: -5 }}
              className={`
                relative w-24 h-24 md:w-32 md:h-32 rounded-full backdrop-blur-xl border-2 border-white/30
                flex items-center justify-center
                transition-all duration-300 ease-out
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95
                bg-gradient-to-br from-cyan-500 to-blue-600
                shadow-[0_0_40px_rgba(6,182,212,0.4)]
                hover:shadow-[0_0_60px_rgba(6,182,212,0.6)]
              `}
              whileTap={{ scale: 0.95 }}
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
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.08, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className={`
                relative w-24 h-24 md:w-32 md:h-32 rounded-full backdrop-blur-xl border-2 border-white/30
                flex items-center justify-center
                transition-all duration-300 ease-out
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-95
                bg-gradient-to-br from-purple-500 to-pink-600
                shadow-[0_0_40px_rgba(168,85,247,0.4)]
                hover:shadow-[0_0_60px_rgba(168,85,247,0.6)]
              `}
            >
              {isDebating ? (
                <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-white animate-spin" />
              ) : (
                <Scale className="w-10 h-10 md:w-12 md:h-12 text-white" />
              )}
            </motion.button>
          </motion.div>

          {/* Status pill - Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.6, type: "spring", stiffness: 150 }}
            className="px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg"
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

      {/* Control Buttons - Below Character - Enhanced */}
      {conversationStarted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 150 }}
          className="flex items-center gap-4 mb-12"
        >
          {/* End Conversation Button - Enhanced */}
          <motion.button
            onClick={handleEndConversation}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 150 }}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-red-500 to-orange-500
              text-white font-bold text-sm
              hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]
              transition-all duration-300 ease-out
              active:scale-95
              border border-white/20"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="flex items-center gap-2">
              <Hand className="w-4 h-4" />
              End Conversation
            </span>
          </motion.button>

          {/* Reset Button - Only show in Normal Mode - Enhanced */}
          {!demoMode && (
            <motion.button
              onClick={() => setShowResetDialog(true)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 150 }}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-violet-600 to-teal-600
                text-white font-bold text-sm
                hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]
                transition-all duration-300 ease-out
                active:scale-95
                border border-white/20"
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Reset
              </span>
            </motion.button>
          )}

          {/* Share Report Button - Generate and share spending report */}
          <motion.button
            onClick={handleShowSpendingReport}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
            className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600
              text-white font-bold text-sm
              hover:shadow-[0_0_30px_rgba(168,85,247,0.5)]
              transition-all duration-300 ease-out
              active:scale-95
              border border-white/20"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
            title="Generate spending report to share with parents"
          >
            <span className="flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Report
            </span>
          </motion.button>
        </motion.div>
      )}

      {/* Settings Button - Enhanced */}
      <motion.button
        initial={{ opacity: 0, scale: 0, rotate: -180 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setSettingsOpen(!settingsOpen)}
        className="absolute top-4 right-4 p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/15 hover:shadow-lg transition-all"
      >
        <Settings className="w-5 h-5 text-white/70" />
      </motion.button>

      {/* Home Button - Back to Landing Page */}
      {conversationStarted && (
        <motion.button
          initial={{ opacity: 0, scale: 0, x: 50 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0, x: 50 }}
          transition={{ delay: 0.6, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleShowOnboarding}
          className="absolute top-4 left-4 px-4 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 backdrop-blur-md border-2 border-white/20 hover:from-purple-700 hover:to-blue-700 hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] transition-all flex items-center gap-2"
        >
          <Home className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-semibold">Home</span>
        </motion.button>
      )}

      {/* Transaction History Button - Enhanced & More Visible */}
      {conversationStarted && transactions.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0, x: 50 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0, x: 50 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowTransactionHistory(!showTransactionHistory)}
          className="absolute top-4 right-20 px-4 py-2 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 backdrop-blur-md border-2 border-white/20 hover:from-teal-700 hover:to-cyan-700 hover:shadow-[0_0_20px_rgba(20,184,166,0.5)] transition-all flex items-center gap-2"
        >
          <History className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-semibold">History</span>
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
          onShowOnboarding={handleShowOnboarding}
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

      {/* Spending Report Panel */}
      {showSpendingReport && (
        <SpendingReportPanel
          budget={budget}
          transactions={transactions}
          onClose={() => setShowSpendingReport(false)}
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

      {/* Debate Input Dialog */}
      <AlertDialog open={showDebateInput} onOpenChange={setShowDebateInput}>
        <AlertDialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-white/10 max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-2xl flex items-center gap-3">
              <Scale className="w-7 h-7 text-purple-400" />
              Finora Debates
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70 text-base">
              Thinking about a purchase? Let Finora debate it for you!
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-4">
            {/* Input Field */}
            <div>
              <input
                type="text"
                value={debateQuestion}
                onChange={(e) => setDebateQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && debateQuestion.trim()) {
                    handleDebateSubmit();
                  }
                }}
                placeholder="e.g., Should I buy $80 jeans?"
                className="w-full px-4 py-3 bg-black/40 border-2 border-purple-500/30 rounded-xl
                  text-white placeholder-white/40 text-lg
                  focus:border-purple-500/60 focus:outline-none
                  transition-colors"
                autoFocus
              />
            </div>

            {/* Quick Suggestions */}
            <div>
              <p className="text-purple-300 text-sm font-semibold mb-2">💡 Quick Examples:</p>
              <div className="grid grid-cols-1 gap-2">
                <motion.button
                  onClick={() => setDebateQuestion("Should I buy $80 jeans when I have limited budget left?")}
                  className="px-4 py-2 text-left rounded-lg bg-purple-600/20 border border-purple-500/30
                    text-white/80 text-sm hover:bg-purple-600/30 hover:border-purple-500/50
                    transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Should I buy $80 jeans when I have limited budget left?
                </motion.button>
                <motion.button
                  onClick={() => setDebateQuestion("Is $50 concert tickets worth it with 8 days left in the month?")}
                  className="px-4 py-2 text-left rounded-lg bg-purple-600/20 border border-purple-500/30
                    text-white/80 text-sm hover:bg-purple-600/30 hover:border-purple-500/50
                    transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Is $50 concert tickets worth it with 8 days left in the month?
                </motion.button>
                <motion.button
                  onClick={() => setDebateQuestion("Should I splurge on $30 brunch or meal prep at home?")}
                  className="px-4 py-2 text-left rounded-lg bg-purple-600/20 border border-purple-500/30
                    text-white/80 text-sm hover:bg-purple-600/30 hover:border-purple-500/50
                    transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Should I splurge on $30 brunch or meal prep at home?
                </motion.button>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
            <motion.button
              onClick={handleDebateSubmit}
              disabled={!debateQuestion.trim()}
              className="px-6 py-2 rounded-md bg-gradient-to-r from-purple-600 to-pink-600
                text-white font-bold
                hover:opacity-90
                transition-all
                disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: debateQuestion.trim() ? 1.05 : 1 }}
              whileTap={{ scale: debateQuestion.trim() ? 0.95 : 1 }}
            >
              Start Debate
            </motion.button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Camera Options Dialog */}
      <AlertDialog open={showCameraOptions} onOpenChange={setShowCameraOptions}>
        <AlertDialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl">Capture Receipt</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Choose how you'd like to add an image
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <motion.button
              onClick={handleTakePhoto}
              className="px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600
                text-white font-bold text-lg
                hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]
                transition-all duration-300 ease-out
                border border-white/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="flex items-center justify-center gap-3">
                <Camera className="w-6 h-6" />
                Take Photo
              </span>
            </motion.button>
            <motion.button
              onClick={handleUploadFile}
              className="px-6 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600
                text-white font-bold text-lg
                hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]
                transition-all duration-300 ease-out
                border border-white/20"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="flex items-center justify-center gap-3">
                <Upload className="w-6 h-6" />
                Upload File
              </span>
            </motion.button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Camera View */}
      <AnimatePresence>
        {showCameraView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          >
            <div className="relative w-full max-w-4xl mx-4">
              <video
                id="camera-video"
                autoPlay
                playsInline
                ref={(video) => {
                  if (video && cameraStream) {
                    video.srcObject = cameraStream;
                  }
                }}
                className="w-full h-auto rounded-2xl border-2 border-white/20"
              />
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
                <motion.button
                  onClick={handleCapturePhoto}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-green-600 to-emerald-600
                    text-white font-bold text-lg
                    hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]
                    transition-all duration-300 ease-out
                    border-2 border-white/30"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="flex items-center gap-2">
                    <Camera className="w-6 h-6" />
                    Capture
                  </span>
                </motion.button>
                <motion.button
                  onClick={handleCloseCameraView}
                  className="px-8 py-4 rounded-full bg-gradient-to-r from-red-600 to-orange-600
                    text-white font-bold text-lg
                    hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]
                    transition-all duration-300 ease-out
                    border-2 border-white/30"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
