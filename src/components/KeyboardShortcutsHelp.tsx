import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard, Mic, Settings, Camera, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  {
    key: "Space / Click Mic",
    description: "Start/stop voice input",
    icon: <Mic className="h-4 w-4" />,
  },
  {
    key: "C",
    description: "Capture image for analysis",
    icon: <Camera className="h-4 w-4" />,
  },
  {
    key: "B",
    description: "Start Finora Debates (Angel vs Devil)",
    icon: <Scale className="h-4 w-4" />,
  },
  {
    key: "S",
    description: "Open voice settings",
    icon: <Settings className="h-4 w-4" />,
  },
  {
    key: "H / ?",
    description: "Show this help panel",
    icon: <Keyboard className="h-4 w-4" />,
  },
  {
    key: "Escape",
    description: "Close panels / Stop listening",
    icon: <X className="h-4 w-4" />,
  },
];

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
          >
            <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-purple-500/30 shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 border-b-2 border-purple-400/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Keyboard className="h-5 w-5 text-white" />
                    <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Shortcuts List */}
              <div className="p-6 space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <motion.div
                    key={shortcut.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-shrink-0 text-purple-400">
                      {shortcut.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white/90">
                        {shortcut.description}
                      </p>
                    </div>
                    <kbd className="px-3 py-1.5 rounded-md bg-white/10 border border-white/20 text-xs font-mono font-semibold text-white">
                      {shortcut.key}
                    </kbd>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 bg-white/5 px-6 py-4">
                <p className="text-xs text-center text-white/60">
                  Press <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs font-mono">Escape</kbd> or click outside to close
                </p>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

