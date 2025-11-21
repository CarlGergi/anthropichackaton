import { motion } from "framer-motion";
import { BudgetState } from "@/types";
import { calculateRemainingTotal, calculateDaysLeft, calculateForecast } from "@/state/budget";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Calendar, DollarSign, AlertCircle } from "lucide-react";

interface QuickStatsDashboardProps {
  budget: BudgetState;
}

export function QuickStatsDashboard({ budget }: QuickStatsDashboardProps) {
  const remaining = calculateRemainingTotal(budget);
  const daysLeft = calculateDaysLeft();
  const forecast = calculateForecast(budget);
  const totalSpent = Object.values(budget.spent).reduce((sum, val) => sum + val, 0);
  const percentageSpent = budget.total > 0 ? (totalSpent / budget.total) * 100 : 0;
  
  // Determine status color
  const getStatusColor = () => {
    if (remaining < 0) return "text-red-100";
    if (remaining < budget.total * 0.1) return "text-orange-100";
    if (remaining < budget.total * 0.3) return "text-yellow-100";
    return "text-green-100";
  };

  const getStatusBg = () => {
    if (remaining < 0) return "from-red-600/80 to-red-700/80 border-red-400/50";
    if (remaining < budget.total * 0.1) return "from-orange-600/80 to-orange-700/80 border-orange-400/50";
    if (remaining < budget.total * 0.3) return "from-yellow-600/80 to-yellow-700/80 border-yellow-400/50";
    return "from-green-600/80 to-green-700/80 border-green-400/50";
  };

  if (budget.total === 0) {
    return null; // Don't show stats if budget isn't set
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 50,
      scale: 0.8
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="w-full max-w-6xl px-4 mb-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Remaining Budget */}
        <motion.div
          variants={cardVariants}
          whileHover={{
            scale: 1.05,
            y: -10,
            transition: { duration: 0.2 }
          }}
          whileTap={{ scale: 0.95 }}
        >
          <Card className={`bg-gradient-to-br ${getStatusBg()} border-2 backdrop-blur-md shadow-lg hover:shadow-2xl transition-shadow duration-300`}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">Remaining</p>
                <DollarSign className="h-4 w-4 text-white/90" />
              </div>
              <motion.p
                key={remaining}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={`text-3xl font-bold ${getStatusColor()} drop-shadow-lg`}
              >
                ${remaining.toFixed(0)}
              </motion.p>
              <p className="text-xs text-white/90 mt-1 font-medium">
                {percentageSpent.toFixed(0)}% spent
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Days Left */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-blue-600/80 to-cyan-600/80 border-2 border-blue-400/50 backdrop-blur-md shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">Days Left</p>
                <Calendar className="h-4 w-4 text-white/90" />
              </div>
              <motion.p
                key={daysLeft}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-3xl font-bold text-white drop-shadow-lg"
              >
                {daysLeft}
              </motion.p>
              <p className="text-xs text-white/90 mt-1 font-medium">
                {daysLeft === 1 ? "day" : "days"} this month
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Forecast */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-600/80 to-pink-600/80 border-2 border-purple-400/50 backdrop-blur-md shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">Forecast</p>
                {forecast > remaining ? (
                  <TrendingUp className="h-4 w-4 text-red-300" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-300" />
                )}
              </div>
              <motion.p
                key={forecast}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className={`text-3xl font-bold drop-shadow-lg ${forecast > remaining ? "text-red-300" : "text-green-300"}`}
              >
                ${forecast.toFixed(0)}
              </motion.p>
              <p className="text-xs text-white/90 mt-1 font-medium">
                {forecast > remaining ? "Over budget" : "On track"}
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Total Spent */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-violet-600/80 to-indigo-600/80 border-2 border-violet-400/50 backdrop-blur-md shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">Total Spent</p>
                <DollarSign className="h-4 w-4 text-white/90" />
              </div>
              <motion.p
                key={totalSpent}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-3xl font-bold text-white drop-shadow-lg"
              >
                ${totalSpent.toFixed(0)}
              </motion.p>
              <p className="text-xs text-white/90 mt-1 font-medium">
                of ${budget.total.toFixed(0)} budget
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Warning Alert */}
      {remaining < 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Card className="bg-gradient-to-r from-red-600/90 to-orange-600/90 border-2 border-red-400/70 backdrop-blur-md shadow-lg">
            <div className="p-3 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-white flex-shrink-0" />
              <p className="text-sm text-white font-medium">
                <strong>You're over budget!</strong> You've spent ${Math.abs(remaining).toFixed(0)} more than your budget. Let's figure this out together!
              </p>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

