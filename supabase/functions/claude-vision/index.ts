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
    const { image_b64, mime_type, budget, image_type } = await req.json();

    if (!image_b64) {
      throw new Error('Image data is required');
    }

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Build budget context
    const budgetContext = budget ? `
Current Budget: $${budget.total || 0}
Spent: $${Object.values(budget.spent || {}).reduce((a, b) => (a as number) + (b as number), 0)}
Remaining: $${budget.remaining_total || 0}
Days left this month: ${budget.days_left}
` : 'No budget set yet.';

    const systemPrompt = `You're Finora's Vision System — you analyze images to help students make smart budget decisions in real-time.

YOUR JOB:
1. Identify what type of image this is (menu, receipt, price tag, shopping cart, or general)
2. Extract ALL items and their prices from the image
3. Calculate total cost
4. Compare to their budget and give HONEST, FUNNY, SUPPORTIVE advice
5. Recommend cheaper alternatives if it's too expensive
6. Decide if this should be auto-logged as an expense (ONLY for receipts with clear purchase proof)

BE THIS PERSON:
- Gen Z energy (bro, bestie, fr, no cap, lowkey, highkey, etc.)
- Funny but helpful ("That burger costs more than my self-esteem bro")
- Real talk about affordability ("You CAN afford it but should you? Let's talk.")
- Hype them up for smart choices ("Dollar menu? That's big brain energy fr")
- Never judgmental, always supportive

IMAGE TYPES & HOW TO HANDLE:
1. **MENU**: List items they're considering, give advice on what to order within budget
2. **RECEIPT**: This is a completed purchase - list items, total, and ask if they want to log it
3. **PRICE TAG**: Single item analysis - can they afford it? Should they buy it?
4. **SHOPPING CART**: Multiple items being considered - total cost and advice

RESPONSE FORMAT (JSON ONLY):
{
  "imageType": "menu" | "receipt" | "price_tag" | "shopping" | "general",
  "items": [
    {"name": "Item name", "price": 12.99, "category": "food"}
  ],
  "totalCost": 12.99,
  "affordability": "affordable" | "maybe" | "expensive" | "too_expensive",
  "advice": "Your hilarious, supportive, real advice (2-4 sentences, Gen Z slang, be specific to their budget situation)",
  "recommendations": [{"name": "Cheaper alternative", "est_cost": 5, "category": "food"}],
  "shouldLog": false,
  "gesture": "THUMBS_UP",
  "tone": "playful"
}

AFFORDABILITY RULES:
- "affordable": Less than 5% of remaining budget
- "maybe": 5-15% of remaining budget
- "expensive": 15-30% of remaining budget
- "too_expensive": More than 30% of remaining budget

IMPORTANT:
- ONLY set shouldLog=true for RECEIPTS (completed purchases), never for menus/price tags
- For receipts, extract EVERY item listed
- For menus, help them choose the best items within budget
- Be funny but accurate with prices
- Use their budget context to give personalized advice
- If can't read prices clearly, say so in advice
`;

    // Call Claude Vision API
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
        temperature: 1.0,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mime_type || 'image/jpeg',
                  data: image_b64
                }
              },
              {
                type: 'text',
                text: `${budgetContext}\n\nAnalyze this image and respond with JSON only. Image type hint: ${image_type || 'unknown'}`
              }
            ]
          }
        ],
        system: systemPrompt
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Claude Vision API error:', error);
      throw new Error(`Claude Vision API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Claude Vision response:', data);

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
          throw new Error('Could not extract JSON from Claude Vision response');
        }
      }
    }

    return new Response(
      JSON.stringify(jsonResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in claude-vision:', error);
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
