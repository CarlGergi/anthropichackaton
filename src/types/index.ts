export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export type GestureType = "THINK" | "THUMBS_UP" | "SHRUG" | "STOP" | "CLAP";

export type CategoryType = "food" | "transport" | "fun" | "essentials" | "clothes" | "other";

export type IntentType =
  | "AFFORDABILITY"
  | "ADD_EXPENSE"
  | "ADVICE"
  | "RECS"
  | "SET_BUDGET"
  | "ASK_CLARIFY"
  | "SMALL_TALK"
  | "GREETING"
  | "ANALYSIS";

export type DecisionType = "YES" | "MAYBE" | "NO" | "ACK" | "ASK_CLARIFY";

export type ToneType = "playful" | "neutral" | "serious";

export interface BudgetState {
  month: string;
  total: number;
  categoryTargets: {
    food: number;
    transport: number;
    fun: number;
    essentials: number;
    clothes: number;
    other: number;
  };
  spent: {
    food: number;
    transport: number;
    fun: number;
    essentials: number;
    clothes: number;
    other: number;
  };
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  merchant: string;
  category: CategoryType;
  source: "voice" | "manual" | "vision";
  rawText?: string;
}

export interface ClaudeResponse {
  intent: IntentType;
  entities: {
    amount: number | null;
    currency: "CAD" | "USD" | null;
    date: string | null;
    category: CategoryType | null;
    merchant: string | null;
    item: string | null;
  };
  decision: DecisionType;
  rationale: {
    remaining_category: number | null;
    remaining_total: number | null;
    days_left: number | null;
    forecast: number | null;
    buffer: number | null;
    notes: string;
  };
  recs: Array<{
    name: string;
    est_cost: number;
    category: string;
  }>;
  analysis?: {
    top_category: string;
    top_amount: number;
    daily_avg: number;
    trend: "increasing" | "decreasing" | "stable";
    insights: string[];
  };
  speech: string;
  tone: ToneType;
  gesture: GestureType;
  tts: {
    style: "cheerful" | "calm" | "neutral";
    rate: "slow" | "medium" | "fast";
    pitch: "low" | "default" | "high";
  };
  state_patch?: {
    introShown?: boolean;
    monthly_budget?: number | null;
    initial_spent?: number;
    category_breakdown?: Partial<{
      food: number;
      transport: number;
      fun: number;
      essentials: number;
      clothes: number;
      other: number;
    }>;
    categories?: Partial<{
      rent: number | null;
      food: number | null;
      fun: number | null;
      other: number | null;
    }>;
  };
}

export interface TTSResponse {
  audio_b64: string;
  mime: string;
  visemes?: Array<{
    t: number;
    id: string;
  }>;
}

export interface Venue {
  name: string;
  category: CategoryType;
  est_cost: number;
  description: string;
  location: string;
}

export type VisionImageType = "menu" | "receipt" | "price_tag" | "shopping" | "general";

export interface VisionAnalysisResult {
  imageType: VisionImageType;
  items: Array<{
    name: string;
    price: number;
    category?: CategoryType;
  }>;
  totalCost: number;
  affordability: "affordable" | "maybe" | "expensive" | "too_expensive";
  advice: string;
  recommendations?: Array<{
    name: string;
    est_cost: number;
    category: string;
  }>;
  shouldLog?: boolean;
  gesture: GestureType;
  tone: ToneType;
}

export interface DebateResult {
  question: string;
  devilArgument: string;
  angelArgument: string;
  verdict: {
    recommendation: "buy" | "wait" | "skip";
    reasoning: string;
    alternatives?: string[];
    financialImpact: {
      cost: number;
      remainingBudget: number;
      daysLeft: number;
      dailyBudgetAfter: number;
    };
  };
}
