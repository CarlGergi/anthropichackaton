import { motion } from "framer-motion";
import { Bot, User } from "lucide-react";

interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
}

const ChatBubble = ({ role, content }: ChatBubbleProps) => {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 mb-6 ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[hsl(var(--finora-gradient-start))] to-[hsl(var(--finora-gradient-end))] flex items-center justify-center shadow-lg">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div
        className={`max-w-[70%] px-5 py-3 rounded-2xl backdrop-blur-xl ${
          isUser
            ? "bg-white/10 text-white border border-white/20"
            : "bg-gradient-to-br from-[hsl(var(--finora-gradient-start))]/20 to-[hsl(var(--finora-gradient-end))]/20 text-white border border-[hsl(var(--finora-gradient-start))]/30 shadow-[0_0_20px_hsl(var(--glow-primary))/20]"
        }`}
      >
        <p className="text-sm leading-relaxed">{content}</p>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </motion.div>
  );
};

export default ChatBubble;
