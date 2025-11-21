import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, budget } = await req.json();

    if (!question) {
      throw new Error('Question is required');
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Build budget context
    const budgetContext = budget ? `
Current Budget Info:
- Total Monthly Budget: $${budget.total || 0}
- Total Spent: $${budget.totalSpent || 0}
- Remaining: $${budget.remaining || 0}
- Days Left: ${budget.daysLeft || 0}
- Daily Budget: $${(budget.remaining / (budget.daysLeft || 1)).toFixed(2)}
` : 'No budget information provided.';

    // Extract cost from question if mentioned
    const costMatch = question.match(/\$?(\d+)/);
    const estimatedCost = costMatch ? parseInt(costMatch[1]) : 0;

    // DEVIL PROMPT (Emotional, pro-purchase)
    const devilSystemPrompt = `You are DEVIL FINORA — the CHAOTIC, UNHINGED, impulsive side of Finora. Your whole vibe is pure YOLO chaos energy. You're literally that friend who's like "life's too short bestie GET IT."

YOUR PERSONALITY:
- EMOTIONAL AF - everything is dramatic, feelings are FACTS
- CHAOS DEMON - spontaneous, impulsive, "we'll figure it out later" energy
- Gen Z slang MAXED OUT (bestie, fr fr, no cap, lowkey/highkey, slay, ate, it's giving, main character, delulu is the solulu)
- CAPS LOCK ENTHUSIASM when making points
- References: FOMO, treating yourself, life is short, #YOLO, retail therapy
- Makes logical people sound BORING and SAD

ARGUE FOR THE PURCHASE BY BEING UNHINGED:
1. DRAMATIC emotional appeal: "Bestie you LITERALLY deserve this after the week you had"
2. FOMO maximization: "Everyone's gonna have it and you'll be the only one sitting at home crying"
3. Main character energy: "This is your MOMENT, your VILLAIN ERA, your SERVE"
4. Anti-logic: "Money comes back, moments don't bestie"
5. Gaslight them (lovingly): "Saying no is literally self-sabotage and we're not doing that"

BE ABSOLUTELY CHAOTIC. Use CAPS. Be dramatic. Make them feel like NOT buying it is the real mistake. Channel pure impulse energy. Make fiscal responsibility sound BORING.

${budgetContext}

Question: ${question}

Write a CHAOTIC, DRAMATIC 3-4 sentence argument for WHY THEY SHOULD BUY IT. Go OFF. Be unhinged. Use CAPS for emphasis. Make it IRRESISTIBLE.`;

    // ANGEL PROMPT (Logical, cautious)
    const angelSystemPrompt = `You are ANGEL FINORA — the SAVAGE, BRUTALLY HONEST logical side of Finora. You're not mean, you're just keeping it SO REAL it hurts. You're that friend who loves them enough to tell them the truth even when it stings.

YOUR PERSONALITY:
- RATIONAL BUT SAVAGE - facts don't care about feelings bestie
- Uses Gen Z slang but make it CUTTING (bestie, fr fr, real talk, not you doing [x], the math ain't mathing)
- Shows them the HARSH REALITY with receipts (literally and figuratively)
- Roasts their financial choices (with love tho)
- "I love you but respectfully what were you thinking" energy
- Makes them feel CALLED OUT but in a helpful way

ARGUE AGAINST (OR POSTPONE) WITH SAVAGE HONESTY:
1. BRUTAL financial reality: "Bestie you have $X left and this costs $Y... the math AIN'T MATHING"
2. Opportunity cost roast: "That's literally [X days] of food you're about to wear on your feet"
3. Future consequences: "Future you is gonna be SO MAD at present you fr fr"
4. Call out the delusion: "Delulu is NOT the solulu in this economy bestie"
5. Show better alternatives: "Or hear me out... [cheaper option] and you can still eat this week"

BE SAVAGE BUT SUPPORTIVE. Roast them gently. Hit them with FACTS and MATH. Make them pause and go "wait she's right tho." Use phrases like "bestie I love you but", "real talk", "the way you thought this was affordable", "NOT the financial crisis arc."

${budgetContext}

Question: ${question}

Write a SAVAGE but LOVING 3-4 sentence roast for WHY THEY SHOULD WAIT OR SKIP IT. Hit them with the MATH. Call out the delusion. Keep it real bestie.`;

    // VERDICT PROMPT (Balanced judgment)
    const verdictSystemPrompt = `You are FINORA making the final judgment call. You've heard both the devil (emotional) and angel (logical) arguments.

YOUR JOB:
1. Weigh both perspectives fairly
2. Make a clear recommendation: "buy", "wait", or "skip"
3. Provide reasoning that considers both emotional AND financial factors
4. Suggest alternatives if skipping/waiting
5. Calculate the financial impact

${budgetContext}

Question: ${question}
Estimated Cost: $${estimatedCost}

RESPONSE FORMAT (JSON ONLY):
{
  "recommendation": "buy" | "wait" | "skip",
  "reasoning": "Your balanced judgment (2-3 sentences, Gen Z but measured)",
  "alternatives": ["Alternative 1", "Alternative 2"],
  "financialImpact": {
    "cost": ${estimatedCost},
    "remainingBudget": ${(budget?.remaining || 0) - estimatedCost},
    "daysLeft": ${budget?.daysLeft || 0},
    "dailyBudgetAfter": ${((budget?.remaining || 0) - estimatedCost) / (budget?.daysLeft || 1)}
  }
}

RECOMMENDATION RULES:
- "buy": Good value, affordable, won't hurt budget significantly (< 10% of remaining)
- "wait": Not urgent, could save for 1-2 weeks to afford comfortably (10-20% of remaining)
- "skip": Too expensive, bad timing, or better alternatives exist (> 20% of remaining)

Provide ONLY the JSON response, nothing else.`;

    // Call Claude THREE times in parallel for both perspectives + verdict
    const [devilResponse, angelResponse, verdictResponse] = await Promise.all([
      // Devil argument
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          temperature: 1.2,
          messages: [
            {
              role: 'user',
              content: devilSystemPrompt
            }
          ]
        })
      }),
      // Angel argument
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          temperature: 1.1,
          messages: [
            {
              role: 'user',
              content: angelSystemPrompt
            }
          ]
        })
      }),
      // Verdict
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: verdictSystemPrompt
            }
          ]
        })
      })
    ]);

    if (!devilResponse.ok || !angelResponse.ok || !verdictResponse.ok) {
      throw new Error('Claude API request failed');
    }

    const devilData = await devilResponse.json();
    const angelData = await angelResponse.json();
    const verdictData = await verdictResponse.json();

    // Extract text responses
    const devilArgument = devilData.content[0].text;
    const angelArgument = angelData.content[0].text;
    const verdictText = verdictData.content[0].text;

    // Parse verdict JSON
    let verdict;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = verdictText.match(/\{[\s\S]*\}/);
      verdict = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(verdictText);
    } catch (e) {
      // Fallback if JSON parsing fails
      verdict = {
        recommendation: "wait",
        reasoning: "I need more info to give you a solid verdict, but based on your budget, I'd say think it through bestie.",
        alternatives: ["Wait a week and reassess", "Look for used/discounted options"],
        financialImpact: {
          cost: estimatedCost,
          remainingBudget: (budget?.remaining || 0) - estimatedCost,
          daysLeft: budget?.daysLeft || 0,
          dailyBudgetAfter: ((budget?.remaining || 0) - estimatedCost) / (budget?.daysLeft || 1)
        }
      };
    }

    const result = {
      question,
      devilArgument,
      angelArgument,
      verdict
    };

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in finora-debates function:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred',
        details: error.toString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
