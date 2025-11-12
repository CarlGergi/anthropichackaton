import { motion, AnimatePresence } from 'framer-motion';
import { VoiceState, GestureType } from '@/types';
import finoraCharacterImg from '@/assets/finora-character.png';

interface FinoraCharacterProps {
  voiceState: VoiceState;
  gesture?: GestureType;
}

export function FinoraCharacter({ voiceState, gesture }: FinoraCharacterProps) {
  // Get gesture animation based on gesture type
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
        <motion.img 
          src={finoraCharacterImg} 
          alt="Finora Character" 
          className="max-h-full max-w-full object-contain"
          style={{
            filter: getGlowColor(),
          }}
          animate={{
            ...idleAnimation,
            ...speakingAnimation,
            ...getGestureAnimation()
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        />
        
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
