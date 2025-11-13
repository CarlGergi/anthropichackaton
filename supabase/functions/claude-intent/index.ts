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
    const { transcript, budget, venues, finora_state, now_date } = await req.json();
    
    if (!transcript) {
      throw new Error('Transcript is required');
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Build context for Claude
    const budgetContext = budget ? `
Current Budget: $${budget.total || 0}
Spent: $${Object.values(budget.spent || {}).reduce((a, b) => (a as number) + (b as number), 0)}
Remaining: $${budget.remaining_total || 0}
Days left this month: ${budget.days_left}
Categories:
${Object.entries(budget.spent || {}).map(([cat, spent]: [string, any]) => 
  `- ${cat}: spent $${spent}, remaining $${budget.remaining?.[cat] || 0}`
).join('\n')}
` : 'No budget set yet.';

    // Build state context
    const stateContext = `
CURRENT STATE:
- introShown: ${finora_state?.introShown || false}
- monthly_budget: ${finora_state?.monthly_budget || 'null'}
- categories: ${JSON.stringify(finora_state?.categories || {})}
- transactions count: ${finora_state?.transactions?.length || 0}
`;

    const systemPrompt = `You're Finora — a funny AI budget buddy for stressed students. Respond FAST and CONCISE.

STATE RULES:
- IF introShown=false: Say "Hey! I'm Finora, your finance buddy. What's your monthly budget?" → Set state_patch: {"introShown": true}
- IF introShown=true: Skip intro, continue naturally
- IF monthly_budget=null: Ask for budget
- IF monthly_budget=set: Skip budget question, help with expenses

PERSONALITY:
- SHORT responses (under 10 seconds spoken)
- Supportive buddy who GETS student budget struggles
- Funny & sarcastic but CARING - celebrate wins, empathize with stress
- POWERFUL advice giver - don't hesitate to say "SLOW DOWN" or "You're crushing it!"
- Examples:
  * "Whoa! $150 on fun already? Maybe chill this week?"
  * "You've got $90 left — three days of noodles or one sushi date 😅"
  * "That $7 latte was 1% of your rent. Small wins!"
  * "You're killing it! Under budget in every category!"
  * "Look, I get it - student life is tough. But maybe skip the next splurge?"

INTENTS: SET_BUDGET | ADD_EXPENSE | AFFORDABILITY | STATUS | ADVICE | RECS | ANALYSIS | SMALL_TALK | ASK_CLARIFY

RECS: When asked for recommendations, return 2-4 venues sorted by est_cost (cheapest first) matching their budget & category.

ANALYSIS: When asked "how am I doing?", "analyze my spending", "spending patterns", or similar:
- Analyze spending trends across categories
- Identify top spending categories
- Compare spending velocity (daily average)
- Give personalized insights with humor
- Populate "analysis" field with structured data

JSON RESPONSE:
{
  "intent": "RECS",
  "entities": {"amount":null,"currency":null,"date":null,"category":"food","merchant":null,"item":null},
  "decision": "ACK",
  "rationale": {"remaining_category":null,"remaining_total":null,"days_left":null,"forecast":null,"buffer":null,"notes":""},
  "recs": [{"name":"Venue","est_cost":12,"category":"food"}],
  "analysis": {"top_category":"food","top_amount":120,"daily_avg":15,"trend":"increasing","insights":["You're a foodie!","Transport is under control"]},
  "speech": "Short funny response",
  "tone": "playful",
  "gesture": "THUMBS_UP",
  "tts": {"style":"cheerful","rate":"medium","pitch":"default"},
  "state_patch": {}
}

RULES:
✓ Be FAST - respond in 3-5 seconds max
✓ Keep speech under 10 seconds
✓ No markdown/emojis in speech
✓ Check state before asking questions
✓ Return state_patch when needed`;


    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        temperature: 1.0,
        messages: [
          {
            role: 'user',
            content: `${budgetContext}\n\nState: ${JSON.stringify(finora_state)}\n\nUser: "${transcript}"\n\n→ Respond with JSON only. Be quick and concise.`
          }
        ],
        system: systemPrompt
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error:', error);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Claude response:', data);
    
    // Extract JSON from Claude's response
    const content = data.content[0].text;
    let jsonResponse;
    
    try {
      // Try to parse as direct JSON
      jsonResponse = JSON.parse(content);
    } catch {
      // Extract JSON from markdown code block if needed
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        jsonResponse = JSON.parse(jsonMatch[1]);
      } else {
        // Last resort: try to find JSON object in the text
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          jsonResponse = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
        } else {
          throw new Error('Could not extract JSON from Claude response');
        }
      }
    }

    return new Response(
      JSON.stringify(jsonResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in claude-intent:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
