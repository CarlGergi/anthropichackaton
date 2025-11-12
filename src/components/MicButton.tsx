import { motion } from "framer-motion";
import { Mic, Loader2, Volume2 } from "lucide-react";
import { VoiceState } from "@/types";

interface MicButtonProps {
  state: VoiceState;
  onToggle: () => void;
}

const MicButton = ({ state, onToggle }: MicButtonProps) => {
  const getButtonStyle = () => {
    switch (state) {
      case "listening":
        return "bg-gradient-to-br from-[hsl(var(--voice-listening))] to-[hsl(var(--voice-listening))]/80 shadow-[0_0_40px_hsl(var(--voice-listening))/60]";
      case "thinking":
        return "bg-gradient-to-br from-[hsl(var(--voice-thinking))] to-[hsl(var(--voice-thinking))]/80 shadow-[0_0_40px_hsl(var(--voice-thinking))/60]";
      case "speaking":
        return "bg-gradient-to-br from-[hsl(var(--voice-speaking))] to-[hsl(var(--voice-speaking))]/80 shadow-[0_0_40px_hsl(var(--voice-speaking))/60]";
      default:
        return "bg-gradient-to-br from-[hsl(var(--finora-gradient-start))] to-[hsl(var(--finora-gradient-end))] shadow-[0_0_40px_hsl(var(--glow-primary))/40]";
    }
  };

  const getIcon = () => {
    switch (state) {
      case "listening":
        return <Mic className="w-8 h-8 text-white" />;
      case "thinking":
        return <Loader2 className="w-8 h-8 text-white animate-spin" />;
      case "speaking":
        return <Volume2 className="w-8 h-8 text-white" />;
      default:
        return <Mic className="w-8 h-8 text-white" />;
    }
  };

  const getStateText = () => {
    switch (state) {
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

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        onClick={onToggle}
        disabled={state === "thinking" || state === "speaking"}
        className={`
          relative w-20 h-20 rounded-full backdrop-blur-xl border-2 border-white/30
          flex items-center justify-center
          transition-all duration-300 ease-out
          disabled:opacity-70 disabled:cursor-not-allowed
          hover:scale-105 active:scale-95
          ${getButtonStyle()}
        `}
        whileTap={{ scale: 0.95 }}
        animate={
          state === "listening"
            ? {
                scale: [1, 1.05, 1],
                transition: { repeat: Infinity, duration: 1.5 },
              }
            : {}
        }
      >
        {/* Glow ring */}
        {state === "listening" && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-white/40"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
            }}
          />
        )}
        
        {getIcon()}
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-white/70 font-inter"
      >
        {getStateText()}
      </motion.p>
    </div>
  );
};

export default MicButton;
