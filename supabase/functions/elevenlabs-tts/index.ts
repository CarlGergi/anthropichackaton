/**
 * ElevenLabs TTS Function
 *
 * This function uses ElevenLabs API for text-to-speech generation.
 * - Requires ELEVENLABS_API_KEY environment variable
 * - Supports multiple ElevenLabs voices
 * - Returns base64-encoded MP3 audio (compatible with frontend)
 * - Free tier: 10,000 characters per month
 */

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

    console.log('[ElevenLabs TTS] Request received:', { textLength: text?.length, voice, style });

    if (!text) {
      throw new Error('Text is required');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('[ElevenLabs TTS] API key not configured!');
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    console.log('[ElevenLabs TTS] API key present');

    // Map voice names to ElevenLabs voice IDs
    // Using popular ElevenLabs voices
    const voiceIds: Record<string, string> = {
      // Direct voice names
      "alloy": "21m00Tcm4TlvDq8ikWAM",     // Rachel - warm American female
      "echo": "ErXwobaYiN019PkySvjV",      // Antoni - well-rounded male
      "fable": "MF3mGyEYCl7XYWbV9V6O",     // Elli - emotional young female
      "nova": "EXAVITQu4vr4xnSDxMaL",      // Bella - soft American female
      "shimmer": "pNInz6obpgDQGcFmaJgB",   // Adam - deep male
      "onyx": "VR6AewLTigWG4xSOukaG",      // Arnold - crisp male
      // Old names for backwards compatibility
      "George": "21m00Tcm4TlvDq8ikWAM",    // Rachel
      "Daniel": "ErXwobaYiN019PkySvjV",    // Antoni
      "Callum": "MF3mGyEYCl7XYWbV9V6O",    // Elli
      "Eric": "ErXwobaYiN019PkySvjV",      // Antoni
      "Brian": "21m00Tcm4TlvDq8ikWAM"      // Rachel
    };

    const elevenLabsVoiceId = voiceIds[voice] || "21m00Tcm4TlvDq8ikWAM";

    // Map style to ElevenLabs settings
    const styleSettings: Record<string, { stability: number; similarity_boost: number }> = {
      "cheerful": { stability: 0.4, similarity_boost: 0.8 },  // More expressive
      "calm": { stability: 0.7, similarity_boost: 0.7 },       // More stable
      "neutral": { stability: 0.5, similarity_boost: 0.75 }    // Balanced
    };

    const voiceSettings = styleSettings[style] || styleSettings["neutral"];

    console.log('[ElevenLabs TTS] Calling API with voice ID:', elevenLabsVoiceId);
    console.log('[ElevenLabs TTS] Text to generate:', text.substring(0, 100) + '...');

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: voiceSettings
        })
      }
    );

    console.log('[ElevenLabs TTS] API response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('[ElevenLabs TTS] API error:', response.status, error);
      throw new Error(`ElevenLabs TTS API error: ${response.status} - ${error}`);
    }

    // Get audio as ArrayBuffer
    console.log('[ElevenLabs TTS] Fetching audio buffer...');
    const audioBuffer = await response.arrayBuffer();
    console.log('[ElevenLabs TTS] Audio buffer size:', audioBuffer.byteLength, 'bytes');

    // Convert to base64 (same format as OpenAI version for frontend compatibility)
    const uint8Array = new Uint8Array(audioBuffer);
    let binary = '';
    const chunkSize = 0x8000;

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    const audio_b64 = btoa(binary);

    console.log('[ElevenLabs TTS] ✓ Success! Generated', audio_b64.length, 'bytes of base64 audio');

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
