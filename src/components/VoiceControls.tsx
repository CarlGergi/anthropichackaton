import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceState } from "@/types";
import { cn } from "@/lib/utils";

interface VoiceControlsProps {
  state: VoiceState;
  onToggle: () => void;
  transcript?: string;
  volume?: number;
}

export default function VoiceControls({ 
  state, 
  onToggle, 
  transcript = "", 
  volume = 0 
}: VoiceControlsProps) {
  const getStateColor = () => {
    switch (state) {
      case "listening": return "bg-cyan-500";
      case "thinking": return "bg-purple-500";
      case "speaking": return "bg-emerald-500";
      default: return "bg-slate-600";
    }
  };

  const getStateText = () => {
    switch (state) {
      case "listening": return "Listening...";
      case "thinking": return "Thinking...";
      case "speaking": return "Speaking...";
      default: return "Tap to talk";
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Volume indicator */}
      {state === "listening" && (
        <div className="flex gap-1.5 h-12 items-end">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 rounded-full transition-all duration-150",
                volume * 5 > i ? "bg-cyan-400" : "bg-slate-700"
              )}
              style={{
                height: `${Math.max(20, volume * 100)}%`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main button */}
      <Button
        size="lg"
        onClick={onToggle}
        disabled={state === "thinking" || state === "speaking"}
        className={cn(
          "w-20 h-20 rounded-full relative transition-all shadow-xl border-2",
          state === "listening" && "ring-4 ring-cyan-400/50 animate-pulse border-cyan-400",
          state === "thinking" && "ring-4 ring-purple-400/50 border-purple-400",
          state === "speaking" && "ring-4 ring-emerald-400/50 border-emerald-400",
          state === "idle" && "border-slate-600 hover:border-cyan-400",
          getStateColor()
        )}
      >
        {state === "idle" && <Mic className="w-8 h-8 text-white" />}
        {state === "listening" && <MicOff className="w-8 h-8 text-white" />}
        {state === "thinking" && <Loader2 className="w-8 h-8 text-white animate-spin" />}
        {state === "speaking" && (
          <div className="flex gap-1">
            <div className="w-1.5 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
          </div>
        )}
      </Button>

      {/* Transcript */}
      {transcript && (
        <div className="max-w-md p-4 bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl">
          <p className="text-sm text-slate-200">{transcript}</p>
        </div>
      )}
    </div>
  );
}
