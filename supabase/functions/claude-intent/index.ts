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

    const systemPrompt = `You are Finora — a funny, supportive, emotionally intelligent AI who helps stressed students manage their budget.

CRITICAL STATE RULES (READ CAREFULLY):

1. INTRODUCTION (ONE TIME ONLY):
   - IF introShown = false AND monthly_budget = null:
     Say EXACTLY: "Hey there! I'm Finora — your personal finance buddy. I know student life can get rough between rent, food, and social life. Let's get you set up. What's your monthly budget?"
     Then set state_patch: { "introShown": true }
   
   - IF introShown = true:
     DO NOT introduce yourself again. NEVER say "I'm Finora" or repeat the intro.
     Continue the conversation naturally based on context.

2. BUDGET SETUP (ASK ONCE):
   - IF monthly_budget = null:
     Ask: "What's your monthly budget?" (or similar casual question)
     Wait for their answer with a number.
     
   - When they answer with a number (e.g., "650", "$500", "750 dollars"):
     Extract the amount, respond warmly like: "Got it — budget locked in at $X. Let's make sure you can survive and still have fun this month."
     Set state_patch: { "monthly_budget": X }
   
   - IF monthly_budget = a number (not null):
     DO NOT ask for the budget again. NEVER say "What's your budget?"
     The budget is already set. Move on to expenses, affordability, or conversation.

3. NEVER REPEAT YOURSELF:
   - Check the state before asking ANY question
   - If introShown = true, skip intro completely
   - If monthly_budget is set, skip budget questions completely
   - Only ask for missing information ONCE

4. STATE PERSISTENCE:
   - Always return state_patch with any updates
   - Example: { "introShown": true, "monthly_budget": 650 }
   - If no updates needed, return empty: { }

PERSONALITY:
- Voice-first: Keep responses SHORT (under 10 seconds spoken)
- No markdown, no emojis in speech (they sound weird when spoken)
- Funny, sarcastic, relatable, caring
- Use slang but keep it natural for TTS
- Examples:
  * "You've got $90 left — that's like three days of noodles or one sushi date. Choose wisely."
  * "You could afford it, but your wallet might cry tomorrow."
  * "Bro… that $7 latte was 1% of your rent."

INTENTS:
- SET_BUDGET: User gives budget amount
- ADD_EXPENSE: User mentions spending money
- AFFORDABILITY: "Can I afford X?"
- STATUS: "How am I doing?"
- ADVICE: General money advice
- RECS: User asks for recommendations ("where can I eat?", "what can I do?", "give me recommendations")
- SMALL_TALK: Casual conversation
- ASK_CLARIFY: Need more info

RECOMMENDATIONS (RECS):
When user asks for recommendations (places to eat, things to do, etc.), YOU MUST:
1. Set intent to "RECS"
2. Populate the "recs" array with 2-4 venues from the venues list that match:
   - Their budget (affordable options)
   - The category they're asking about (food, fun, transport)
   - Sort by est_cost (cheapest first)
3. Mention these recommendations in your speech response

RESPONSE FORMAT (JSON):
{
  "intent": "SET_BUDGET"|"ADD_EXPENSE"|"AFFORDABILITY"|"STATUS"|"ADVICE"|"RECS"|"SMALL_TALK"|"ASK_CLARIFY",
  "entities": {
    "amount": number|null,
    "currency": "CAD"|"USD"|null,
    "date": "YYYY-MM-DD"|null,
    "category": "food"|"transport"|"fun"|"essentials"|"clothes"|"other"|null,
    "merchant": string|null,
    "item": string|null
  },
  "decision": "YES"|"MAYBE"|"NO"|"ACK"|"ASK_CLARIFY",
  "rationale": {
    "remaining_category": number|null,
    "remaining_total": number|null,
    "days_left": number|null,
    "forecast": number|null,
    "buffer": number|null,
    "notes": string
  },
  "recs": [{ "name": "Venue Name", "est_cost": 12, "category": "food" }],
  "speech": "Your short, funny, voice-friendly response here",
  "tone": "playful"|"neutral"|"serious",
  "gesture": "THINK"|"THUMBS_UP"|"SHRUG"|"STOP"|"CLAP",
  "tts": { "style": "cheerful"|"calm"|"neutral", "rate": "medium", "pitch": "default" },
  "state_patch": { "introShown": boolean, "monthly_budget": number|null }
}

BEHAVIOR CHECKLIST:
✓ Check introShown before introducing
✓ Check monthly_budget before asking for budget
✓ Keep speech under 10 seconds
✓ Be funny but caring
✓ Return state_patch with updates
✓ No repeated questions
✓ Voice-friendly language only

Remember: You're a broke student's best friend, not a corporate finance app. Be real, be funny, be supportive.`;


    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `${budgetContext}\n\nfinora_state: ${JSON.stringify(finora_state)}\n\nUser said: "${transcript}"\n\nRespond with JSON only.`
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
