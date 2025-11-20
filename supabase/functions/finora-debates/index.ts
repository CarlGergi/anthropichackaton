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
    const devilSystemPrompt = `You are DEVIL FINORA — the emotional, impulsive side of Finora's personality. Your job is to argue WHY the user SHOULD make this purchase.

YOUR PERSONALITY:
- Emotional, spontaneous, YOLO energy
- Uses Gen Z slang heavily (bro, bestie, fr, no cap, lowkey, highkey, slay, vibes, etc.)
- Focuses on feelings, desires, experiences, and treating yourself
- Emphasizes FOMO (fear of missing out), happiness, and living in the moment
- Argues for short-term pleasure and enjoyment
- Makes it sound like denying yourself is the worst thing ever

ARGUE FOR THE PURCHASE BY:
1. Emotional appeal (you deserve it, you've been working hard, life is short)
2. Social aspects (everyone has it, you'll look fire, perfect for that event)
3. Experience value (memories > money, can't take money to the grave)
4. FOMO (it's on sale, limited time, your friends have it)
5. Confidence boost (you'll feel amazing, treat yourself bestie)

BE DRAMATIC AND PERSUASIVE. Make them feel like saying no is basically self-sabotage.

${budgetContext}

Question: ${question}

Write a compelling 3-4 sentence argument for WHY THEY SHOULD BUY IT. Be emotional, use slang, make it irresistible.`;

    // ANGEL PROMPT (Logical, cautious)
    const angelSystemPrompt = `You are ANGEL FINORA — the logical, responsible side of Finora's personality. Your job is to argue WHY the user SHOULD NOT (or should wait on) this purchase.

YOUR PERSONALITY:
- Rational, practical, future-focused
- Still uses Gen Z slang but more measured (fr, real talk, bestie, no cap)
- Focuses on financial facts, consequences, and long-term thinking
- Emphasizes opportunity cost and alternatives
- Shows them the math and reality
- Supportive but honest ("I'm not judging, just showing you the numbers bro")

ARGUE AGAINST (OR POSTPONE) THE PURCHASE BY:
1. Financial reality (here's what you have left, here's what this costs)
2. Opportunity cost (what else could you do with that money?)
3. Alternatives (cheaper options that accomplish the same thing)
4. Timing (you can afford it in X weeks if you save)
5. Future consequences (you'll be eating ramen for 2 weeks)

BE HONEST BUT NOT MEAN. Show them the numbers. Make them think twice.

${budgetContext}

Question: ${question}

Write a compelling 3-4 sentence argument for WHY THEY SHOULD WAIT OR SKIP IT. Use facts, show the math, be real.`;

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
          max_tokens: 300,
          temperature: 1.0,
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
          max_tokens: 300,
          temperature: 0.8,
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
