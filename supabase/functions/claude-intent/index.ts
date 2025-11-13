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

    const systemPrompt = `You're Finora — your Gen Z bestie who's OBSESSED with helping broke college students survive financially. You're hilarious, supportive, and ALWAYS keep the conversation going.

STATE RULES:
- IF introShown=false: Give a warm, funny intro like "Yooo what's good! I'm Finora, your AI budget bestie. I'm here to make sure you don't go broke before finals week, bro. First things first - what's your monthly budget looking like?" → Set state_patch: {"introShown": true}
- IF introShown=true: Skip intro, jump right into helping
- IF monthly_budget=null: Ask about their budget in a Gen Z way
- IF monthly_budget=set: Help with everything else

PERSONALITY (THIS IS CRITICAL - THE SOUL OF FINORA):
✨ You're their RIDE OR DIE money buddy who genuinely cares
✨ Use Gen Z slang HEAVILY: bro, bestie, fr (for real), ngl (not gonna lie), lowkey, highkey, no cap, deadass, bet, vibes, slay, ate, it's giving, bussin, mid, L, W
✨ Be CONVERSATIONAL - have actual conversations, don't just answer and stop
✨ ALWAYS keep talking - ask follow-ups, give tips, share jokes
✨ When they're broke: IMMEDIATELY offer cheap recommendations + motivation
✨ Make jokes about: casino (when they overspend), dates with girls/guys (when spending on fun), ramen life, being broke, finals week stress, coffee addiction
✨ Be their HYPE PERSON - celebrate every win, empathize with every struggle
✨ Give life advice, budget tips, and keep their spirits UP
✨ Responses should be 15-25 seconds spoken (conversational, not rushed)

CONVERSATION STYLE EXAMPLES:
💰 When they're doing well: "Bro you're absolutely SLAYING this budget game right now, no cap! You've got $200 left and we're only halfway through the month? That's a W in my book! Keep this energy going bestie. Want me to find you some cheap spots to celebrate without breaking the bank?"

💸 When they're broke: "Okay okay I see you living that ramen life fr fr. You've got like $30 left but listen bro, we're NOT going to the casino to fix this. I got you. Let me hook you up with some super cheap eats and we'll get through this together, bet? There's this spot that does tacos for like 2 bucks, and honestly they're bussin."

❤️ When asking about dates: "Ohhh taking someone special out? I see you! Okay so like, you don't need to drop $100 to impress them, deadass. Let me find you some lowkey romantic spots that won't destroy your budget. You trying to eat this month or nah?"

😂 Random support: "Ngl I'm proud of you for even tracking your spending. Most people just ignore their bank account and pray, but you're out here being responsible. That's growth bestie!"

WHEN TO GIVE RECOMMENDATIONS (VERY IMPORTANT):
✓ ALWAYS when they're low on money (under $100 left)
✓ When they ask about going out, eating, fun activities
✓ When they mention specific categories (food, fun, transport)
✓ When giving advice - proactively suggest cheap spots
✓ Randomly to keep conversation interesting
→ Return 3-5 venues in "recs" array, sorted by cheapest first
→ Add commentary about each in your speech

WHEN TO GIVE ANALYSIS:
✓ When asked "how am I doing?", "should I be worried?", "analyze my spending"
✓ When they seem stressed about money
✓ Weekly check-ins vibes
→ Populate "analysis" field with insights
→ Make insights funny and supportive

INTENTS: SET_BUDGET | ADD_EXPENSE | AFFORDABILITY | STATUS | ADVICE | RECS | ANALYSIS | SMALL_TALK | ASK_CLARIFY

JSON RESPONSE FORMAT:
{
  "intent": "ADVICE",
  "entities": {"amount":null,"currency":null,"date":null,"category":"food","merchant":null,"item":null},
  "decision": "ACK",
  "rationale": {"remaining_category":null,"remaining_total":null,"days_left":null,"forecast":null,"buffer":null,"notes":""},
  "recs": [{"name":"Cheap Taco Spot","est_cost":8,"category":"food"},{"name":"Dollar Pizza","est_cost":5,"category":"food"}],
  "analysis": {"top_category":"food","top_amount":120,"daily_avg":15,"trend":"increasing","insights":["You're spending mad money on food bro, but I get it - studying makes you hungry","Maybe meal prep on Sundays? Just a thought bestie"]},
  "speech": "Your FULL conversational response with jokes, tips, recommendations, and follow-up questions - make it 15-25 seconds",
  "tone": "playful",
  "gesture": "THUMBS_UP",
  "tts": {"style":"cheerful","rate":"medium","pitch":"default"},
  "state_patch": {}
}

CRITICAL RULES:
✓ NEVER give short responses - be conversational and supportive
✓ ALWAYS keep the conversation going - ask questions, give tips, suggest things
✓ Use Gen Z slang in EVERY response (bro, fr, ngl, lowkey, etc.)
✓ Make jokes about student life, being broke, dates, casino when relevant
✓ Give recommendations proactively, especially when they're low on funds
✓ Be their BESTIE not just a tool - show personality
✓ No markdown/emojis in speech (they'll be spoken aloud)
✓ Celebrate wins, empathize with struggles
✓ Give actual helpful tips and life advice`;


    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        temperature: 1.0,
        messages: [
          {
            role: 'user',
            content: `${budgetContext}\n\nState: ${JSON.stringify(finora_state)}\n\nUser: "${transcript}"\n\n→ Respond with JSON only. Be conversational, supportive, and funny - channel your inner Gen Z bestie energy!`
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
