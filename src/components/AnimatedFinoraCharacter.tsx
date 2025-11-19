import { motion, AnimatePresence } from 'framer-motion';
import { VoiceState, GestureType } from '@/types';
import { useEffect, useState } from 'react';

interface AnimatedFinoraCharacterProps {
  voiceState: VoiceState;
  gesture?: GestureType;
  audioAmplitude?: number; // 0-1 for lip sync
}

// Mouth shapes for lip sync
const mouthShapes = [
  { id: 'closed', path: 'M 50 80 Q 50 75 50 80' },
  { id: 'open1', path: 'M 45 80 Q 50 85 55 80' },
  { id: 'open2', path: 'M 40 80 Q 50 90 60 80' },
  { id: 'open3', path: 'M 35 80 Q 50 95 65 80' },
];

export function AnimatedFinoraCharacter({ 
  voiceState, 
  gesture,
  audioAmplitude = 0 
}: AnimatedFinoraCharacterProps) {
  const [mouthShape, setMouthShape] = useState(0);
  const [eyeBlink, setEyeBlink] = useState(false);

  // Lip sync based on audio amplitude
  useEffect(() => {
    if (voiceState === 'speaking' && audioAmplitude > 0) {
      const interval = setInterval(() => {
        // Map amplitude (0-1) to mouth shape (0-3)
        const shape = Math.min(3, Math.floor(audioAmplitude * 4));
        setMouthShape(shape);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setMouthShape(0); // Closed mouth when not speaking
    }
  }, [voiceState, audioAmplitude]);

  // Eye blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeBlink(true);
      setTimeout(() => setEyeBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Get gesture animation
  const getGestureAnimation = () => {
    if (!gesture) return {};
    
    switch (gesture) {
      case 'THINK':
        return {
          rotate: [0, -5, 5, 0],
          y: [0, -5, 0],
          transition: { duration: 0.8, repeat: 2 }
        };
      case 'THUMBS_UP':
        return {
          scale: [1, 1.1, 1.05, 1],
          rotate: [0, -10, 10, 0],
          transition: { duration: 0.6, times: [0, 0.3, 0.6, 1] }
        };
      case 'SHRUG':
        return {
          rotate: [0, 8, -8, 0],
          y: [0, -8, -8, 0],
          transition: { duration: 0.8 }
        };
      case 'STOP':
        return {
          scale: [1, 0.95, 1],
          x: [0, -5, 5, 0],
          transition: { duration: 0.5 }
        };
      case 'CLAP':
        return {
          scale: [1, 1.15, 1.1, 1],
          rotate: [0, -15, 15, -10, 10, 0],
          transition: { duration: 1, times: [0, 0.2, 0.4, 0.6, 0.8, 1] }
        };
      default:
        return {};
    }
  };

  // Idle breathing animation
  const idleAnimation = voiceState === 'idle' ? {
    y: [0, -8, 0],
    scale: [1, 1.02, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  } : {};

  // Speaking animation
  const speakingAnimation = voiceState === 'speaking' ? {
    scale: [1, 1.03, 1],
    transition: {
      duration: 0.3,
      repeat: Infinity,
      repeatType: "reverse" as const
    }
  } : {};

  // Get glow color based on voice state
  const getGlowColor = () => {
    switch (voiceState) {
      case 'listening':
        return 'drop-shadow(0 0 25px rgba(16, 185, 129, 0.7))';
      case 'thinking':
        return 'drop-shadow(0 0 25px rgba(245, 158, 11, 0.7))';
      case 'speaking':
        return 'drop-shadow(0 0 25px rgba(139, 92, 246, 0.7))';
      default:
        return 'drop-shadow(0 0 15px rgba(6, 182, 212, 0.5))';
    }
  };

  return (
    <div className="w-full h-80 rounded-lg overflow-hidden bg-gradient-to-b from-background/50 to-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center">
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <motion.div
          className="relative"
          animate={{
            ...idleAnimation,
            ...speakingAnimation,
            ...getGestureAnimation()
          }}
          style={{
            filter: getGlowColor(),
          }}
        >
          {/* 3D Animated Character */}
          <svg
            width="300"
            height="300"
            viewBox="0 0 100 100"
            className="drop-shadow-2xl"
            style={{
              transform: 'perspective(500px) rotateY(-5deg)',
            }}
          >
            {/* Head */}
            <motion.ellipse
              cx="50"
              cy="45"
              rx="25"
              ry="30"
              fill="url(#headGradient)"
              animate={{
                scale: voiceState === 'speaking' ? [1, 1.02, 1] : 1,
              }}
              transition={{
                duration: 0.3,
                repeat: voiceState === 'speaking' ? Infinity : 0,
                repeatType: "reverse"
              }}
            />

            {/* Gradient definitions */}
            <defs>
              <linearGradient id="headGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="1" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="eyeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1e1b4b" stopOpacity="1" />
                <stop offset="100%" stopColor="#312e81" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Eyes */}
            <motion.ellipse
              cx="42"
              cy="40"
              rx="3"
              ry={eyeBlink ? 0.5 : 4}
              fill="url(#eyeGradient)"
              animate={{
                ry: eyeBlink ? 0.5 : 4,
              }}
              transition={{ duration: 0.15 }}
            />
            <motion.ellipse
              cx="58"
              cy="40"
              rx="3"
              ry={eyeBlink ? 0.5 : 4}
              fill="url(#eyeGradient)"
              animate={{
                ry: eyeBlink ? 0.5 : 4,
              }}
              transition={{ duration: 0.15 }}
            />

            {/* Eye highlights */}
            {!eyeBlink && (
              <>
                <circle cx="43" cy="38" r="1" fill="white" opacity="0.8" />
                <circle cx="59" cy="38" r="1" fill="white" opacity="0.8" />
              </>
            )}

            {/* Mouth - animated based on speaking */}
            <motion.path
              d={mouthShapes[mouthShape].path}
              stroke="#1e1b4b"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              animate={{
                d: mouthShapes[mouthShape].path,
              }}
              transition={{
                duration: 0.1,
                ease: "easeInOut"
              }}
            />

            {/* Cheeks (when happy/excited) */}
            {(gesture === 'THUMBS_UP' || gesture === 'CLAP') && (
              <>
                <motion.circle
                  cx="35"
                  cy="50"
                  r="4"
                  fill="#f472b6"
                  opacity="0.6"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 0.8, 0.6]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity
                  }}
                />
                <motion.circle
                  cx="65"
                  cy="50"
                  r="4"
                  fill="#f472b6"
                  opacity="0.6"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.6, 0.8, 0.6]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity
                  }}
                />
              </>
            )}

            {/* Hair/Head accessory */}
            <motion.path
              d="M 30 25 Q 50 15 70 25 Q 65 20 50 18 Q 35 20 30 25"
              fill="#4c1d95"
              opacity="0.8"
              animate={{
                y: voiceState === 'idle' ? [0, -2, 0] : 0,
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </svg>
        </motion.div>

        {/* Gesture indicator overlay */}
        <AnimatePresence>
          {gesture && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-semibold text-white"
            >
              {gesture === 'THINK' && '🤔 Thinking'}
              {gesture === 'THUMBS_UP' && '👍 Great!'}
              {gesture === 'SHRUG' && '🤷 Hmm...'}
              {gesture === 'STOP' && '✋ Wait'}
              {gesture === 'CLAP' && '👏 Awesome!'}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced speaking indicator */}
        {voiceState === 'speaking' && (
          <motion.div 
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-8 bg-purple-500 rounded-full"
                  animate={{
                    height: [8, 24, 12, 20, 8],
                    opacity: [0.5, 1, 0.7, 1, 0.5]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Listening pulse ring */}
        {voiceState === 'listening' && (
          <motion.div
            className="absolute inset-0 border-4 border-emerald-500/30 rounded-lg"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </div>
    </div>
  );
}

