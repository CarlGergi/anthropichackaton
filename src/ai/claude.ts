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

      const errorMsg = error.message || JSON.stringify(error);
      const errorStr = JSON.stringify(error);

      // Check if it's a NOT FOUND (404) error - function not deployed
      if (errorMsg.includes('Not Found') || errorMsg.includes('404') ||
          errorStr.includes('Not Found') || errorStr.includes('404')) {
        logger.error('🚨 DEPLOYMENT ERROR: claude-intent function not deployed!');
        return getFallbackResponse(transcript, budgetContext, 'DEPLOY_ERROR');
      }

      // Check if it's an API key error
      if (errorMsg.includes('ANTHROPIC_API_KEY')) {
        logger.error('🚨 API KEY ERROR: ANTHROPIC_API_KEY not set in Supabase!');
        return getFallbackResponse(transcript, budgetContext, 'API_KEY_ERROR');
      }

      // Check if it's a runtime error (500)
      if (errorMsg.includes('FunctionsRelayError') || errorMsg.includes('FunctionsHttpError') ||
          errorMsg.includes('non-2xx') || errorMsg.includes('non 2xx') || errorMsg.includes('2XX')) {
        logger.error('🚨 RUNTIME ERROR: Edge function failed. Check console for error details.');
        logger.error('Error details:', errorMsg);
        return getFallbackResponse(transcript, budgetContext, 'RUNTIME_ERROR');
      }

      throw error;
    }

    logger.log('Claude response:', data);
    return data as ClaudeResponse;
  } catch (error) {
    logger.error('Error calling Claude:', error);
    // Fallback to basic response on error
    return getFallbackResponse(transcript, budgetContext, 'UNKNOWN_ERROR');
  }
}

// Fallback response if API fails
function getFallbackResponse(transcript: string, budgetState: any, errorType: string = 'UNKNOWN_ERROR'): ClaudeResponse {
  let speechMessage = "I'm having trouble processing that. Could you try again?";
  let notes = "Error connecting to AI";

  if (errorType === 'DEPLOY_ERROR') {
    speechMessage = "Oops! My AI brain isn't deployed yet. Ask your developer to run: supabase functions deploy claude-intent";
    notes = "Edge function not deployed";
  } else if (errorType === 'API_KEY_ERROR') {
    speechMessage = "Hey bestie, my API key isn't set up! Tell your developer to add ANTHROPIC_API_KEY to Supabase secrets.";
    notes = "ANTHROPIC_API_KEY not configured in Supabase";
  } else if (errorType === 'RUNTIME_ERROR') {
    speechMessage = "Oof, something broke on my end. Check the browser console for the error details!";
    notes = "Runtime error in edge function - check console";
  }

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
      notes: notes,
    },
    recs: [],
    speech: speechMessage,
    tone: "neutral",
    gesture: "THINK",
    tts: {
      style: "neutral",
      rate: "medium",
      pitch: "default",
    },
  };
}
