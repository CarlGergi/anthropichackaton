import { BudgetState, ClaudeResponse, Venue } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { FinoraState } from "@/state/finoraState";
import { logger } from "@/lib/logger";
import {
  calculateRemaining,
  calculateRemainingTotal,
  calculateDaysLeft,
  calculateForecast,
  calculateBuffer
} from "@/state/budget";

export async function getIntent(
  transcript: string,
  budget: BudgetState,
  venues: Venue[],
  finoraState: FinoraState,
  demoMode: boolean = false
): Promise<ClaudeResponse> {
  logger.log('Calling Claude API with transcript:', transcript);

  // Build budget context for Claude
  const budgetContext = {
    month: budget.month,
    total: budget.total,
    categoryTargets: budget.categoryTargets,
    spent: budget.spent,
    remaining: {
      food: calculateRemaining(budget, "food"),
      transport: calculateRemaining(budget, "transport"),
      fun: calculateRemaining(budget, "fun"),
      essentials: calculateRemaining(budget, "essentials"),
      clothes: calculateRemaining(budget, "clothes"),
      other: calculateRemaining(budget, "other"),
    },
    remaining_total: calculateRemainingTotal(budget),
    days_left: calculateDaysLeft(),
    forecast: calculateForecast(budget),
    buffer: calculateBuffer(budget),
  };

  try {
    const { data, error } = await supabase.functions.invoke('claude-intent', {
      body: {
        transcript,
        budget: budgetContext,
        venues,
        finora_state: finoraState,
        now_date: new Date().toISOString(),
        demo_mode: demoMode
      }
    });

    if (error) {
      logger.error('Edge function error:', error);
      throw error;
    }

    logger.log('Claude response:', data);
    return data as ClaudeResponse;
  } catch (error) {
    logger.error('Error calling Claude:', error);
    // Fallback to basic response on error
    return getFallbackResponse(transcript, budgetContext);
  }
}

// Fallback response if API fails
function getFallbackResponse(transcript: string, budgetState: any): ClaudeResponse {
  return {
    intent: "SMALL_TALK",
    entities: {
      amount: null,
      currency: null,
      date: null,
      category: null,
      merchant: null,
      item: null,
    },
    decision: "ACK",
    rationale: {
      remaining_category: null,
      remaining_total: budgetState.remaining_total,
      days_left: budgetState.days_left,
      forecast: budgetState.forecast,
      buffer: budgetState.buffer,
      notes: "Error connecting to AI",
    },
    recs: [],
    speech: "I'm having trouble processing that. Could you try again?",
    tone: "neutral",
    gesture: "THINK",
    tts: {
      style: "neutral",
      rate: "medium",
      pitch: "default",
    },
  };
}
