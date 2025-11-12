import { Settings, Globe, Volume2, Play, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { textToSpeech, playAudioFromBase64 } from "@/voice/tts";
import { toast } from "sonner";

interface VoiceSettingsProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
}

const languages = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
];

const voices = [
  { 
    id: 'alloy', 
    name: 'Alloy', 
    description: 'Neutral, warm, friendly',
    sample: "Hey! I'm Finora, your budget buddy. Let's make smart money moves together!"
  },
  { 
    id: 'echo', 
    name: 'Echo', 
    description: 'Calm, professional',
    sample: "I'm here to help you manage your finances with confidence."
  },
  { 
    id: 'fable', 
    name: 'Fable', 
    description: 'British accent, upbeat',
    sample: "Brilliant! Let's get your budget sorted and keep you on track."
  },
  { 
    id: 'nova', 
    name: 'Nova', 
    description: 'Energetic, young',
    sample: "You've got this! I'll help you save money and still have fun."
  },
  { 
    id: 'shimmer', 
    name: 'Shimmer', 
    description: 'Soft, gentle',
    sample: "Let's work together to make your budget goals achievable and stress-free."
  },
];

export default function VoiceSettings({ 
  language, 
  onLanguageChange,
  selectedVoice,
  onVoiceChange
}: VoiceSettingsProps) {
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const handlePlaySample = async (voiceId: string, sample: string) => {
    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }

    setPlayingVoice(voiceId);
    
    try {
      const ttsResponse = await textToSpeech(sample, voiceId, "cheerful");
      
      if (ttsResponse.audio_b64) {
        const audio = playAudioFromBase64(
          ttsResponse.audio_b64,
          ttsResponse.mime,
          () => {
            setPlayingVoice(null);
            setCurrentAudio(null);
          }
        );
        setCurrentAudio(audio);
      } else {
        toast.error('Could not play sample');
        setPlayingVoice(null);
      }
    } catch (error) {
      console.error('Sample playback failed:', error);
      toast.error('Sample playback failed');
      setPlayingVoice(null);
    }
  };

  return (
    <div className="absolute top-20 right-4 p-6 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 w-96 max-h-[600px] overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-white" />
        <h3 className="text-lg font-semibold text-white">Voice Settings</h3>
      </div>
      
      <div className="space-y-6">
        {/* Voice Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-white/80">
            <Volume2 className="w-4 h-4" />
            Voice
          </Label>
          
          <div className="space-y-2">
            {voices.map((voice) => (
              <div
                key={voice.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  selectedVoice === voice.id
                    ? 'bg-purple-500/20 border-purple-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
                onClick={() => onVoiceChange(voice.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-white">{voice.name}</div>
                    <div className="text-xs text-white/60">{voice.description}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlaySample(voice.id, voice.sample);
                    }}
                    disabled={playingVoice === voice.id}
                  >
                    {playingVoice === voice.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Play className="w-4 h-4 text-white" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-white/50 italic">"{voice.sample}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-white/80">
            <Globe className="w-4 h-4" />
            Language
          </Label>
          <Select value={language} onValueChange={onLanguageChange}>
            <SelectTrigger className="bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info */}
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <p className="text-xs text-white/70 leading-relaxed">
            <strong>Chrome over HTTPS</strong> is recommended for best results. 
            Allow microphone access when prompted and speak clearly.
          </p>
        </div>
      </div>
    </div>
  );
}
