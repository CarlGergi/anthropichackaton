import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClaudeResponse, TTSResponse } from "@/types";
import { Code2, X } from "lucide-react";

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lastClaudeResponse?: ClaudeResponse;
  lastTTSResponse?: TTSResponse;
  sttSupport?: {
    hasWebSpeech: boolean;
    hasHTTPS: boolean;
    hasMicPermission: boolean | null;
    browserName: string;
  };
  sttEngine?: string;
  sttLastError?: string | null;
}

export default function DebugPanel({
  isOpen,
  onClose,
  lastClaudeResponse,
  lastTTSResponse,
  sttSupport,
  sttEngine,
  sttLastError
}: DebugPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-background border-l shadow-lg">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Debug Panel</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* STT Debug Info */}
              {sttSupport && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      🎤 Speech Recognition Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Browser:</span>
                        <Badge variant="outline">{sttSupport.browserName}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Web Speech API:</span>
                        <Badge variant={sttSupport.hasWebSpeech ? "default" : "destructive"}>
                          {sttSupport.hasWebSpeech ? "✓ Supported" : "✗ Not Supported"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">HTTPS:</span>
                        <Badge variant={sttSupport.hasHTTPS ? "default" : "destructive"}>
                          {sttSupport.hasHTTPS ? "✓ Secure" : "✗ Insecure"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Mic Permission:</span>
                        <Badge variant={
                          sttSupport.hasMicPermission === null ? "outline" :
                          sttSupport.hasMicPermission ? "default" : "destructive"
                        }>
                          {sttSupport.hasMicPermission === null ? "Not checked" :
                           sttSupport.hasMicPermission ? "✓ Granted" : "✗ Denied"}
                        </Badge>
                      </div>
                      {sttEngine && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Active Engine:</span>
                          <Badge variant="outline" className="font-mono">{sttEngine}</Badge>
                        </div>
                      )}
                      {sttLastError && (
                        <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded">
                          <span className="text-xs text-destructive">Last Error: {sttLastError}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Claude Response */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Latest Claude Response</CardTitle>
                    {lastClaudeResponse && (
                      <Badge>{lastClaudeResponse.intent}</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {lastClaudeResponse ? (
                    <div className="space-y-4">
                      {/* Decision & Gesture */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Decision</p>
                          <Badge variant="outline" className="text-sm">
                            {lastClaudeResponse.decision}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Gesture</p>
                          <Badge variant="outline" className="text-sm">
                            {lastClaudeResponse.gesture}
                          </Badge>
                        </div>
                      </div>

                      {/* Speech */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Speech</p>
                        <p className="text-sm p-2 bg-muted rounded">
                          {lastClaudeResponse.speech}
                        </p>
                      </div>

                      {/* Entities */}
                      {Object.values(lastClaudeResponse.entities).some(v => v !== null) && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Entities</p>
                          <pre className="text-xs p-2 bg-muted rounded overflow-x-auto">
                            {JSON.stringify(lastClaudeResponse.entities, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Rationale */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Rationale</p>
                        <pre className="text-xs p-2 bg-muted rounded overflow-x-auto">
                          {JSON.stringify(lastClaudeResponse.rationale, null, 2)}
                        </pre>
                      </div>

                      {/* Recommendations */}
                      {lastClaudeResponse.recs.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Recommendations</p>
                          <div className="space-y-2">
                            {lastClaudeResponse.recs.map((rec, i) => (
                              <div key={i} className="p-2 bg-muted rounded text-xs">
                                <p className="font-medium">{rec.name}</p>
                                <p className="text-muted-foreground">
                                  ${rec.est_cost} • {rec.category}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Full JSON */}
                      <details>
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                          View Full JSON
                        </summary>
                        <pre className="text-xs p-2 bg-muted rounded overflow-x-auto mt-2">
                          {JSON.stringify(lastClaudeResponse, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No Claude response yet. Start a conversation!
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* TTS Response */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Latest TTS Response</CardTitle>
                </CardHeader>
                <CardContent>
                  {lastTTSResponse ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">MIME Type</p>
                        <Badge variant="outline">{lastTTSResponse.mime}</Badge>
                      </div>

                      {lastTTSResponse.visemes && lastTTSResponse.visemes.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">
                            Visemes ({lastTTSResponse.visemes.length})
                          </p>
                          <ScrollArea className="h-[200px]">
                            <div className="space-y-1">
                              {lastTTSResponse.visemes.map((v, i) => (
                                <div key={i} className="text-xs p-1 bg-muted rounded font-mono">
                                  {v.t.toFixed(3)}s → {v.id}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Audio Data</p>
                        <p className="text-xs p-2 bg-muted rounded">
                          {lastTTSResponse.audio_b64 
                            ? `${lastTTSResponse.audio_b64.length} characters`
                            : "Empty (mock mode)"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No TTS response yet. Start a conversation!
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Test Scenarios */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Test Scenarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-muted rounded">
                      <p className="font-medium mb-1">Test 1: Log Expense</p>
                      <p className="text-muted-foreground font-mono">
                        "I spent twelve eighty-four at Subway today"
                      </p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="font-medium mb-1">Test 2: Affordability (Maybe)</p>
                      <p className="text-muted-foreground font-mono">
                        "Can I do a $45 date Friday?"
                      </p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="font-medium mb-1">Test 3: Affordability (No)</p>
                      <p className="text-muted-foreground font-mono">
                        "I want a $60 hoodie now"
                      </p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="font-medium mb-1">Test 4: Need Clarification</p>
                      <p className="text-muted-foreground font-mono">
                        "Can I go somewhere fancy Friday?"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
