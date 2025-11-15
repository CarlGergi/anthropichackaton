/**
 * ElevenLabs Text-to-Speech Function
 *
 * This function uses ElevenLabs API for natural voice generation.
 * ElevenLabs offers a free tier with 10,000 characters/month.
 *
 * Requirements:
 * - ELEVENLABS_API_KEY environment variable
 * - Supports voices: Rachel, Domi, Bella, Antoni, Elli, Josh, Arnold, Adam, Sam
 * - Returns base64-encoded MP3 audio
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ElevenLabs voice IDs (free tier voices)
const ELEVENLABS_VOICES: Record<string, string> = {
  // Female voices
  "rachel": "21m00Tcm4TlvDq8ikWAM",    // Rachel - calm, friendly
  "domi": "AZnzlk1XvdvUeBnXmlld",      // Domi - strong, confident
  "bella": "EXAVITQu4vr4xnSDxMaL",     // Bella - soft, young
  "elli": "MF3mGyEYCl7XYWbV9V6O",      // Elli - emotional, expressive

  // Male voices
  "antoni": "ErXwobaYiN019PkySvjV",    // Antoni - well-rounded, versatile
  "josh": "TxGEqnHWrfWFTfGW9XjX",      // Josh - deep, authoritative
  "arnold": "VR6AewLTigWG4xSOukaG",    // Arnold - crisp, clear
  "adam": "pNInz6obpgDQGcFmaJgB",      // Adam - narrative, storytelling
  "sam": "yoZ06aMxZJJ28mfd3POQ",       // Sam - dynamic, energetic

  // Legacy mappings for backwards compatibility
  "alloy": "21m00Tcm4TlvDq8ikWAM",     // Map to Rachel
  "echo": "TxGEqnHWrfWFTfGW9XjX",      // Map to Josh
  "fable": "EXAVITQu4vr4xnSDxMaL",     // Map to Bella
  "nova": "MF3mGyEYCl7XYWbV9V6O",      // Map to Elli
  "shimmer": "AZnzlk1XvdvUeBnXmlld",   // Map to Domi
  "onyx": "ErXwobaYiN019PkySvjV",      // Map to Antoni
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const text = body.text;
    const voice: string = body.voice || "rachel";
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

    // Get voice ID (default to Rachel if not found)
    const voiceId = ELEVENLABS_VOICES[voice.toLowerCase()] || ELEVENLABS_VOICES["rachel"];

    // Map style to voice settings
    // stability: 0-1 (higher = more stable/consistent)
    // similarity_boost: 0-1 (higher = more similar to original voice)
    const styleSettings: Record<string, { stability: number; similarity_boost: number }> = {
      "cheerful": { stability: 0.5, similarity_boost: 0.75 },  // More expressive
      "calm": { stability: 0.8, similarity_boost: 0.85 },      // Very stable
      "neutral": { stability: 0.65, similarity_boost: 0.8 }    // Balanced
    };

    const voiceSettings = styleSettings[style] || styleSettings["neutral"];

    console.log('[ElevenLabs TTS] Using voice ID:', voiceId, 'settings:', voiceSettings);
    console.log('[ElevenLabs TTS] Text to generate:', text.substring(0, 100) + '...');

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1", // Free tier model
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

    // Convert to base64
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
