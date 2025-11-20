import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Flame, Scale, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { DebateResult } from "@/types";

interface FinoraDebatesPanelProps {
  result: DebateResult | null;
  onClose: () => void;
  isLoading?: boolean;
}

export const FinoraDebatesPanel = ({ result, onClose, isLoading }: FinoraDebatesPanelProps) => {
  if (!result && !isLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border-2 border-purple-500/30 rounded-3xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="mb-6"
              >
                <Scale className="w-16 h-16 text-purple-400" />
              </motion.div>
              <p className="text-xl text-white font-bold mb-2">Finora is debating...</p>
              <p className="text-white/60">Weighing both sides of your decision</p>
            </div>
          ) : result ? (
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Scale className="w-8 h-8 text-purple-400" />
                  <h2 className="text-3xl font-bold text-white">Finora Debates</h2>
                </div>
                <p className="text-xl text-purple-200 font-medium">{result.question}</p>
              </div>

              {/* Debate Split View */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {/* Devil Side (Emotional) */}
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative bg-gradient-to-br from-red-600/20 to-orange-600/20 border-2 border-red-500/40 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-red-500/20 rounded-full">
                      <Flame className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-red-300">Devil Finora</h3>
                      <p className="text-sm text-red-200/70">Emotional Side</p>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-xl p-4 border border-red-500/20">
                    <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                      {result.devilArgument}
                    </p>
                  </div>

                  {/* Decorative flame */}
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2
                    }}
                    className="absolute -top-2 -right-2"
                  >
                    <Flame className="w-8 h-8 text-red-500" />
                  </motion.div>
                </motion.div>

                {/* Angel Side (Logical) */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="relative bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/40 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-blue-500/20 rounded-full">
                      <Sparkles className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-blue-300">Angel Finora</h3>
                      <p className="text-sm text-blue-200/70">Logical Side</p>
                    </div>
                  </div>

                  <div className="bg-black/30 rounded-xl p-4 border border-blue-500/20">
                    <p className="text-white/90 leading-relaxed whitespace-pre-wrap">
                      {result.angelArgument}
                    </p>
                  </div>

                  {/* Decorative sparkle */}
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3
                    }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-8 h-8 text-blue-400" />
                  </motion.div>
                </motion.div>
              </div>

              {/* The Verdict */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-2 border-purple-500/50 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Scale className="w-6 h-6 text-purple-300" />
                  <h3 className="text-2xl font-bold text-white">The Verdict</h3>
                </div>

                {/* Recommendation Badge */}
                <div className="flex items-center gap-4 mb-4">
                  <div className={`
                    px-6 py-3 rounded-full font-bold text-lg border-2
                    ${result.verdict.recommendation === "buy"
                      ? "bg-green-500/20 border-green-500/50 text-green-300"
                      : result.verdict.recommendation === "wait"
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                      : "bg-red-500/20 border-red-500/50 text-red-300"
                    }
                  `}>
                    {result.verdict.recommendation === "buy" && "✓ Go For It"}
                    {result.verdict.recommendation === "wait" && "⏳ Maybe Wait"}
                    {result.verdict.recommendation === "skip" && "✗ Skip It"}
                  </div>
                </div>

                {/* Reasoning */}
                <div className="bg-black/40 rounded-xl p-5 mb-4 border border-purple-500/20">
                  <p className="text-white/90 leading-relaxed text-lg">
                    {result.verdict.reasoning}
                  </p>
                </div>

                {/* Financial Impact */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-black/30 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-purple-300 text-sm mb-1">Cost</p>
                    <p className="text-white text-xl font-bold">
                      ${result.verdict.financialImpact.cost}
                    </p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-purple-300 text-sm mb-1">Budget Left</p>
                    <p className="text-white text-xl font-bold">
                      ${result.verdict.financialImpact.remainingBudget}
                    </p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-purple-300 text-sm mb-1">Days Left</p>
                    <p className="text-white text-xl font-bold">
                      {result.verdict.financialImpact.daysLeft}
                    </p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-4 border border-purple-500/20">
                    <p className="text-purple-300 text-sm mb-1">Daily Budget After</p>
                    <p className="text-white text-xl font-bold">
                      ${result.verdict.financialImpact.dailyBudgetAfter.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Alternatives */}
                {result.verdict.alternatives && result.verdict.alternatives.length > 0 && (
                  <div className="bg-black/30 rounded-xl p-5 border border-purple-500/20">
                    <p className="text-purple-300 font-semibold mb-3">💡 Alternatives to Consider:</p>
                    <ul className="space-y-2">
                      {result.verdict.alternatives.map((alt, index) => (
                        <li key={index} className="text-white/80 flex items-start gap-2">
                          <span className="text-purple-400 mt-1">→</span>
                          <span>{alt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            </div>
          ) : null}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
