import { motion } from "framer-motion";
import { Camera, DollarSign, X, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Receipt, ShoppingCart, Tag } from "lucide-react";
import { VisionAnalysisResult } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface VisionResultPanelProps {
  result: VisionAnalysisResult;
  onClose?: () => void;
  onLogExpense?: () => void;
}

const affordabilityColors = {
  affordable: "bg-green-500/10 text-green-700 border-green-300",
  maybe: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
  expensive: "bg-orange-500/10 text-orange-700 border-orange-300",
  too_expensive: "bg-red-500/10 text-red-700 border-red-300",
};

const affordabilityIcons = {
  affordable: <CheckCircle className="h-5 w-5 text-green-600" />,
  maybe: <AlertCircle className="h-5 w-5 text-yellow-600" />,
  expensive: <TrendingUp className="h-5 w-5 text-orange-600" />,
  too_expensive: <TrendingDown className="h-5 w-5 text-red-600" />,
};

const imageTypeIcons = {
  menu: <ShoppingCart className="h-5 w-5" />,
  receipt: <Receipt className="h-5 w-5" />,
  price_tag: <Tag className="h-5 w-5" />,
  shopping: <ShoppingCart className="h-5 w-5" />,
  general: <Camera className="h-5 w-5" />,
};

const imageTypeLabels = {
  menu: "Menu",
  receipt: "Receipt",
  price_tag: "Price Tag",
  shopping: "Shopping",
  general: "Image",
};

export function VisionResultPanel({ result, onClose, onLogExpense }: VisionResultPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.95 }}
      transition={{ duration: 0.5, type: "spring", bounce: 0.25 }}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-[90vw] max-w-lg"
    >
      <Card className="relative overflow-hidden border-2 border-purple-300 bg-white shadow-2xl">
        {/* Header */}
        <div className="relative border-b-2 border-purple-200 bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-white"
              >
                {imageTypeIcons[result.imageType]}
              </motion.div>
              <h3 className="font-bold text-base text-white">
                Finora Vision: {imageTypeLabels[result.imageType]}
              </h3>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[500px] overflow-y-auto p-4 space-y-4">
          {/* Items List */}
          {result.items && result.items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                Items Found
              </h4>
              <div className="space-y-1.5">
                {result.items.map((item, index) => (
                  <motion.div
                    key={`${item.name}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-800 font-medium truncate">
                      {item.name}
                    </span>
                    <span className="text-sm font-bold text-purple-600 ml-2">
                      ${item.price.toFixed(2)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Total Cost */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="p-3 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border-2 border-purple-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Total Cost</span>
              <span className="text-xl font-bold text-purple-700">
                ${result.totalCost.toFixed(2)}
              </span>
            </div>
          </motion.div>

          {/* Affordability Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2"
          >
            {affordabilityIcons[result.affordability]}
            <Badge className={`${affordabilityColors[result.affordability]} px-3 py-1 text-xs font-semibold border`}>
              {result.affordability === "affordable" && "Affordable!"}
              {result.affordability === "maybe" && "Think About It"}
              {result.affordability === "expensive" && "Pricey"}
              {result.affordability === "too_expensive" && "Too Expensive!"}
            </Badge>
          </motion.div>

          {/* Advice */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-3 bg-purple-50 rounded-lg border border-purple-200"
          >
            <p className="text-sm text-gray-800 leading-relaxed">
              {result.advice}
            </p>
          </motion.div>

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-2"
            >
              <h4 className="text-sm font-semibold text-gray-700">Cheaper Alternatives</h4>
              <div className="space-y-1.5">
                {result.recommendations.map((rec, index) => (
                  <div
                    key={`${rec.name}-${index}`}
                    className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200"
                  >
                    <span className="text-sm text-gray-800 truncate">{rec.name}</span>
                    <span className="text-sm font-bold text-green-600 ml-2">
                      ${rec.est_cost.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Log Expense Button (for receipts) */}
          {result.shouldLog && onLogExpense && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                onClick={onLogExpense}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Log This Expense
              </Button>
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
