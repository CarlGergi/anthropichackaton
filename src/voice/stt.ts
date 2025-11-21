// Speech-to-Text using Web Speech API
import { logger } from "@/lib/logger";

export type STTCallback = (transcript: string, isFinal: boolean) => void;

interface STTConfig {
  language?: string;
  onEngineChange?: (engine: 'webspeech') => void;
}

export interface STTSupport {
  hasWebSpeech: boolean;
  hasHTTPS: boolean;
  hasMicPermission: boolean | null;
  browserName: string;
}

export class SpeechToText {
  private recognition: any;
  private isListening = false;
  private onTranscript: STTCallback | null = null;
  private onError: ((error: string, code?: string) => void) | null = null;
  private config: STTConfig = { language: 'en-US' };
  private retryCount = 0;
  private maxRetries = 2;
  private retryTimeout: number | null = null;
  private silenceTimeout: number | null = null;
  private stream: MediaStream | null = null;
  private lastError: string | null = null;

  constructor(config?: STTConfig) {
    this.config = { ...this.config, ...config };
    
    // Load saved language preference
    const savedLang = localStorage.getItem('stt_language');
    if (savedLang) this.config.language = savedLang;
  }

  static checkSupport(): STTSupport {
    const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasHTTPS = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    
    let browserName = 'Unknown';
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) browserName = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browserName = 'Safari';
    else if (ua.includes('Firefox')) browserName = 'Firefox';
    else if (ua.includes('Edge')) browserName = 'Edge';

    return {
      hasWebSpeech,
      hasHTTPS,
      hasMicPermission: null,
      browserName
    };
  }

  async requestMicPermission(): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      return true;
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.onError?.('Microphone access blocked. Click the lock icon in your address bar and allow Microphone.', 'not-allowed');
      } else if (error.name === 'NotFoundError') {
        this.onError?.('No microphone found. Please connect a microphone and try again.', 'audio-capture');
      } else {
        this.onError?.('Could not access microphone: ' + error.message, 'unknown');
      }
      return false;
    }
  }

  private initWebSpeech(): boolean {
    const support = SpeechToText.checkSupport();
    
    if (!support.hasHTTPS) {
      this.onError?.('Voice requires HTTPS. Try accessing via https://', 'https-required');
      return false;
    }

    if (!support.hasWebSpeech) {
      this.onError?.(`Voice not supported in ${support.browserName}. Please try Chrome.`, 'not-supported');
      return false;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.lang = this.config.language || 'en-US';

    let finalTranscript = '';
    let hasReceivedSpeech = false;

    this.recognition.onresult = (event: any) => {
      hasReceivedSpeech = true;
      let interimTranscript = "";
      finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript && this.onTranscript) {
        this.onTranscript(finalTranscript, true);
      } else if (interimTranscript && this.onTranscript) {
        this.onTranscript(interimTranscript, false);
      }

      // Reset silence timeout - increased to 15 seconds for more speaking time
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
      }
      this.silenceTimeout = window.setTimeout(() => {
        if (this.isListening) {
          this.stop();
        }
      }, 15000);
    };

    this.recognition.onerror = (event: any) => {
      logger.error("[STT] Speech recognition error:", event.error);
      this.lastError = event.error;
      
      const errorCode = event.error;
      
      switch (errorCode) {
        case 'not-allowed':
        case 'service-not-allowed':
          this.onError?.('Microphone access blocked. Click the lock icon in your address bar and allow Microphone.', errorCode);
          this.stop();
          break;
          
        case 'no-speech':
          if (!hasReceivedSpeech) {
            this.onError?.("I didn't hear anything. Speak clearly and closer to the mic.", errorCode);
          }
          // Don't stop immediately, let user try again
          this.isListening = false;
          break;
          
        case 'audio-capture':
          this.onError?.('No microphone found. Please connect a microphone.', errorCode);
          this.stop();
          break;
          
        case 'network':
          // Retry on network errors
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            logger.log(`[STT] Network error, retrying (${this.retryCount}/${this.maxRetries})...`);
            this.retryTimeout = window.setTimeout(() => {
              if (this.isListening && this.recognition) {
                try {
                  this.recognition.start();
                } catch (e) {
                  logger.error('[STT] Retry failed:', e);
                  this.onError?.('Web Speech API failed. Please try again.', 'network-failed');
                  this.stop();
                }
              }
            }, 500 * this.retryCount);
          } else {
            logger.error('[STT] Max retries reached.');
            this.onError?.('Web Speech API failed after retries. Please try again.', errorCode);
            this.stop();
          }
          break;
          
        default:
          this.onError?.(`Speech recognition error: ${errorCode}. Please try again.`, errorCode);
          this.stop();
      }
    };

    this.recognition.onend = () => {
      if (this.isListening && !hasReceivedSpeech && !this.lastError) {
        this.onError?.("No speech detected. Please try again.", 'no-speech');
      }
      
      if (this.isListening && this.retryCount === 0) {
        // Auto-restart if still supposed to be listening and not in error state
        try {
          this.recognition.start();
        } catch (e) {
          logger.error('Auto-restart failed:', e);
        }
      } else {
        this.stop();
      }
    };

    return true;
  }

  async start(onTranscript: STTCallback, onError?: (error: string, code?: string) => void): Promise<void> {
    logger.log('[STT] Starting speech recognition...');
    this.onTranscript = onTranscript;
    this.onError = onError || null;
    this.retryCount = 0;
    this.lastError = null;

    // Request mic permission first
    logger.log('[STT] Requesting microphone permission...');
    const permitted = await this.requestMicPermission();
    if (!permitted) {
      logger.error('[STT] Microphone permission denied');
      return;
    }
    logger.log('[STT] ✓ Microphone permission granted');

    // Initialize Web Speech API
    logger.log('[STT] Initializing Web Speech API...');
    const success = this.initWebSpeech();
    if (!success) {
      logger.error('[STT] Web Speech API initialization failed');
      return;
    }
    logger.log('[STT] ✓ Web Speech API ready');

    this.isListening = true;
    this.config.onEngineChange?.('webspeech');

    if (this.recognition) {
      try {
        logger.log('[STT] Starting Web Speech recognition...');
        this.recognition.start();
        logger.log('[STT] ✓ Recognition started successfully');
      } catch (e: any) {
        logger.error("[STT] ✗ Failed to start recognition:", e);
        onError?.('Failed to start: ' + e.message, 'start-error');
      }
    }
  }

  stop(): void {
    this.isListening = false;
    this.retryCount = 0;
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors on stop
      }
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  isActive(): boolean {
    return this.isListening;
  }

  setLanguage(language: string): void {
    this.config.language = language;
    localStorage.setItem('stt_language', language);
    if (this.recognition) {
      this.recognition.lang = language;
    }
  }

  getConfig(): STTConfig {
    return { ...this.config };
  }

  getLastError(): string | null {
    return this.lastError;
  }
}
