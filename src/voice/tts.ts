import { TTSResponse } from "@/types";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";

export async function textToSpeech(
  text: string,
  voice: string = "George",
  style: string = "neutral"
): Promise<TTSResponse> {
  logger.log(`[TTS] Starting: "${text.substring(0, 50)}..." voice: ${voice}, style: ${style}`);

  try {
    const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
      body: {
        text,
        voice,
        style
      }
    });

    if (error) {
      logger.error('[TTS] Edge function error:', error);
      throw new Error(`TTS Error: ${error.message || 'Unknown error'}`);
    }

    if (!data || !data.audio_b64) {
      logger.error('[TTS] No audio data received:', data);
      throw new Error('No audio data in response');
    }
    
    logger.log('[TTS] ✓ Success! Audio length:', data.audio_b64.length, 'bytes');
    return data as TTSResponse;
  } catch (error) {
    logger.error('[TTS] ✗ Failed:', error);
    throw error; // Re-throw instead of silently returning null
  }
}

// Global audio context to unlock on first user interaction
let audioContextUnlocked = false;
let globalAudioElement: HTMLAudioElement | null = null;

// Global audio context - reuse to avoid "MediaElementSource already exists" errors
let globalAudioContext: AudioContext | null = null;
let animationFrameId: number | null = null;

// Call this on user interaction (button click) to unlock audio
export function unlockAudio() {
  if (!audioContextUnlocked) {
    globalAudioElement = new Audio();
    globalAudioElement.volume = 1.0;
    // Play and immediately pause to unlock audio context
    globalAudioElement.play().then(() => {
      globalAudioElement?.pause();
      audioContextUnlocked = true;
      logger.log('[Audio] ✓ Audio context unlocked');
    }).catch(() => {
      logger.log('[Audio] Audio unlock attempted');
    });
  }
}

export function playAudioFromBase64(
  base64Audio: string,
  mimeType: string,
  onEnded?: () => void,
  onAmplitude?: (amplitude: number) => void
): HTMLAudioElement | null {
  logger.log('[Audio] Starting playback, data size:', base64Audio?.length || 0, 'bytes');

  if (!base64Audio) {
    logger.error('[Audio] ✗ No audio data provided!');
    onEnded?.();
    return null;
  }

  try {
    // Cancel any ongoing animation frame
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // Convert base64 to blob
    logger.log('[Audio] Decoding base64...');
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    logger.log('[Audio] Creating blob, size:', bytes.length, 'bytes');
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    logger.log('[Audio] Blob URL created:', url);

    // Create fresh audio element each time
    const audio = new Audio(url);
    audio.volume = 1.0;

    // Enable autoplay by setting the required attributes
    audio.setAttribute('autoplay', 'true');
    audio.setAttribute('playsinline', 'true');

    // Store nodes for cleanup
    let source: MediaElementAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;

    // Set up audio context for amplitude tracking
    if (onAmplitude) {
      try {
        // Reuse or create audio context (fixes "MediaElementSource already exists" error)
        if (!globalAudioContext) {
          globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          logger.log('[Audio] Created new AudioContext');
        }

        // Resume context if suspended (browser autoplay policy)
        if (globalAudioContext.state === 'suspended') {
          globalAudioContext.resume();
          logger.log('[Audio] Resumed suspended AudioContext');
        }

        // Create new source for this audio element
        source = globalAudioContext.createMediaElementSource(audio);
        analyser = globalAudioContext.createAnalyser();
        analyser.fftSize = 256;

        source.connect(analyser);
        analyser.connect(globalAudioContext.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const checkAmplitude = () => {
          if (audio.paused || !analyser) {
            if (onAmplitude) onAmplitude(0);
            return;
          }

          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          const normalized = average / 255;
          onAmplitude(normalized);

          animationFrameId = requestAnimationFrame(checkAmplitude);
        };

        audio.onplay = () => {
          logger.log('[Audio] ▶ Playing...');
          checkAmplitude();
        };
      } catch (audioCtxError) {
        logger.warn('[Audio] Could not setup AudioContext:', audioCtxError);
        // Continue without amplitude tracking - just play the audio normally
        audio.onplay = () => {
          logger.log('[Audio] ▶ Playing (without amplitude tracking)...');
        };
      }
    }

    const cleanup = () => {
      logger.log('[Audio] Cleaning up...');

      // Disconnect Web Audio nodes
      if (source) {
        try {
          source.disconnect();
          logger.log('[Audio] Source disconnected');
        } catch (e) {
          // Already disconnected, ignore
        }
      }
      if (analyser) {
        try {
          analyser.disconnect();
          logger.log('[Audio] Analyser disconnected');
        } catch (e) {
          // Already disconnected, ignore
        }
      }

      URL.revokeObjectURL(url);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (onAmplitude) onAmplitude(0);
    };

    audio.onended = () => {
      logger.log('[Audio] ✓ Playback ended');
      cleanup();
      onEnded?.();
    };

    audio.onerror = (err) => {
      logger.error("[Audio] ✗ Playback error:", err);
      cleanup();
      onEnded?.();
    };

    // Attach cleanup as a custom property so it can be called externally
    (audio as any).cleanup = cleanup;

    // Start playback
    logger.log('[Audio] Attempting to play...');
    audio.play()
      .then(() => {
        logger.log('[Audio] ✓ Play started successfully');
      })
      .catch((err) => {
        logger.error("[Audio] ✗ Play failed:", err);
        cleanup();
        onEnded?.();
      });

    return audio;
  } catch (error) {
    logger.error("[Audio] ✗ Critical error in playAudioFromBase64:", error);
    if (onAmplitude) onAmplitude(0);
    onEnded?.();
    return null;
  }
}
