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
    const body = await req.json();
    const text = body.text;
    const voice: string = body.voice || "George";
    const style: string = body.style || "neutral";
    
    console.log('[OpenAI TTS] Request received:', { textLength: text?.length, voice, style });
    
    if (!text) {
      throw new Error('Text is required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('[OpenAI TTS] API key not configured!');
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    console.log('[OpenAI TTS] API key present');

    // Map voice names to OpenAI voice IDs
    // Support both old names (for backwards compatibility) and new direct voice IDs
    const voiceIds: Record<string, string> = {
      // New direct voice IDs
      "alloy": "alloy",
      "echo": "echo", 
      "fable": "fable",
      "nova": "nova",
      "shimmer": "shimmer",
      // Old names for backwards compatibility
      "George": "alloy",
      "Daniel": "echo",
      "Callum": "fable",
      "Eric": "echo",
      "Brian": "alloy"
    };

    const openaiVoice = voiceIds[voice] || "alloy";

    // Map style to speed (OpenAI doesn't have direct style control)
    const styleSettings: Record<string, number> = {
      "cheerful": 1.05,  // Slightly faster but not too much
      "calm": 0.95,      // Slightly slower, more relaxed
      "neutral": 1.0     // Normal speed
    };

    const speed = styleSettings[style] || 1.0;

    console.log('[OpenAI TTS] Calling API with voice:', openaiVoice, 'speed:', speed);
    console.log('[OpenAI TTS] Text to generate:', text.substring(0, 100) + '...');

    const response = await fetch(
      'https://api.openai.com/v1/audio/speech',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: openaiVoice,
          speed: speed,
          response_format: 'mp3'
        })
      }
    );

    console.log('[OpenAI TTS] API response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('[OpenAI TTS] API error:', response.status, error);
      throw new Error(`OpenAI TTS API error: ${response.status} - ${error}`);
    }

    // Get audio as ArrayBuffer
    console.log('[OpenAI TTS] Fetching audio buffer...');
    const audioBuffer = await response.arrayBuffer();
    console.log('[OpenAI TTS] Audio buffer size:', audioBuffer.byteLength, 'bytes');
    
    // Convert to base64
    const uint8Array = new Uint8Array(audioBuffer);
    let binary = '';
    const chunkSize = 0x8000;
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const audio_b64 = btoa(binary);

    console.log('[OpenAI TTS] ✓ Success! Generated', audio_b64.length, 'bytes of base64 audio');

    return new Response(
      JSON.stringify({
        audio_b64,
        mime: "audio/mpeg",
        text,
        voice,
        style
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in elevenlabs-tts:', error);
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
