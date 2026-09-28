import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Mic, Square, Loader2, Play, Sparkles, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import ExpertProfile from '../components/capture/ExpertProfile';
import ChatInterface, { type Message } from '../components/capture/ChatInterface';
import AudioVisualizer from '../components/capture/AudioVisualizer';
import LiveExtraction from '../components/capture/LiveExtraction';
import { useSpeech } from '../hooks/useSpeech';
import { useAuth } from '../contexts/AuthContext';

export default function Capture() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [sessionData, setSessionData] = useState<any>(null);
  const { token, user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [interimText, setInterimText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [insights, setInsights] = useState<any[]>([]);
  const [gaps, setGaps] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiStateMsg, setAiStateMsg] = useState("Thinking...");
  const [speechBuffer, setSpeechBuffer] = useState("");
  const [aiStreamingText, setAiStreamingText] = useState("");
  const navigate = useNavigate();
  
  const accumulatedSpeechRef = useRef("");
  
  const wsRef = useRef<WebSocket | null>(null);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    
    // Fetch initial session data to populate profile
    fetch(`http://localhost:8000/api/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setSessionData(data);
        if (data.messages && data.messages.length > 0) {
           setMessages(data.messages.map((m: any, i: number) => ({ id: `msg-${i}`, role: m.role, content: m.content })));
        }
        
        if (data.insights && data.insights.length > 0) {
          setInsights(data.insights.filter((i: any) => i.type !== 'gap'));
          setGaps(data.insights.filter((i: any) => i.type === 'gap'));
        }
        
        if (data.coverage !== undefined) {
          setCoverage(data.coverage);
        }
        
        if (data.status !== 'completed') {
          // Initialize WebSocket connection only if active
          const ws = new WebSocket(`ws://localhost:8000/ws/session/${sessionId}`);
          
          let sentenceBuffer = "";
          let localStreamText = "";
          
          ws.onmessage = (event) => {
            const wdata = JSON.parse(event.data);
            
            if (wdata.type === "ai_state_change") {
              setAiStateMsg(wdata.state);
            } else if (wdata.type === "ai_stream") {
              setIsThinking(false);
              sentenceBuffer += wdata.token;
              localStreamText += wdata.token;
              
              setAiStreamingText(localStreamText);
              
              // Speak complete sentences to stream audio cleanly
              if (/[.?!]\s$/.test(sentenceBuffer) || sentenceBuffer.endsWith('\n')) {
                 speak(sentenceBuffer.trim());
                 sentenceBuffer = "";
              }
            } else if (wdata.type === "ai_stream_end") {
              if (sentenceBuffer.trim()) {
                 speak(sentenceBuffer.trim());
              }
              
              const finalContent = localStreamText;
              if (finalContent.trim()) {
                setMessages(prevMsgs => [...prevMsgs, { id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, role: 'ai', content: finalContent }]);
              }
              setAiStreamingText("");
              setAiStateMsg("Thinking..."); // Reset for next time
              
              sentenceBuffer = "";
              localStreamText = "";
            } else if (wdata.type === "ai_insights") {
              setCoverage(wdata.coverage);
              
              setInsights(prev => [...wdata.insights, ...prev]);
              if (wdata.gaps) {
                setGaps(prev => [...wdata.gaps, ...prev]);
              }
              
              if (wdata.is_complete) {
                setTimeout(async () => {
                  setIsGenerating(true);
                  try {
                    await fetch(`http://localhost:8000/api/sessions/${sessionId}/complete`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    await fetch(`http://localhost:8000/api/sessions/${sessionId}/generate-assets`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    setSessionData((prev: any) => ({ ...prev, status: 'completed' }));
                    if (user?.role === 'ADMIN') {
                      navigate("/assets");
                    }
                  } catch (err) {
                    console.error(err);
                    setIsGenerating(false);
                  }
                }, 5000); // Wait 5s for the bot to finish speaking
              }
            }
          };

          wsRef.current = ws;
        }
      })
      .catch(console.error);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sessionId, token]);

  const handleSpeechResult = useCallback((text: string, isFinal: boolean) => {
    // The mic is muted while BoomerBot speaks (half-duplex), so anything captured here is the expert.
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    if (isFinal) {
      const cleanText = text.trim();
      accumulatedSpeechRef.current = accumulatedSpeechRef.current 
        ? `${accumulatedSpeechRef.current} ${cleanText}` 
        : cleanText;
      setSpeechBuffer(accumulatedSpeechRef.current);
      setInterimText("");
    } else {
      setInterimText(text);
    }

    speechTimeoutRef.current = setTimeout(() => {
      const finalUtterance = accumulatedSpeechRef.current.trim();
      if (finalUtterance) {
        setMessages(prev => [...prev, { id: `expert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, role: 'expert', content: finalUtterance }]);
        setIsThinking(true);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: "expert_message",
            content: finalUtterance
          }));
        }
        accumulatedSpeechRef.current = "";
        setSpeechBuffer("");
      }
      setInterimText("");
    }, 3000);
  }, []);

  const { isListening, isSpeaking, startListening, stopListening, speak } = useSpeech(handleSpeechResult);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleGenerateAssets = async () => {
    setIsGenerating(true);
    try {
      await fetch(`http://localhost:8000/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetch(`http://localhost:8000/api/sessions/${sessionId}/generate-assets`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      navigate("/assets");
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" />
            Knowledge Capture Session
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {sessionData?.status === 'completed' 
              ? "This knowledge capture session is completed."
              : "Conducting AI-driven interview to extract and preserve tacit knowledge."}
          </p>
        </div>
        {sessionData?.status === 'completed' ? (
          user?.role === 'ADMIN' ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleGenerateAssets}
                disabled={isGenerating}
                className="bg-primary/10 text-primary border border-primary/20 px-5 py-2.5 rounded-lg hover:bg-primary/20 flex items-center gap-2 transition-all shadow-sm text-sm font-medium disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Regenerate Assets
              </button>
              <Link 
                to="/assets"
                className="bg-secondary text-secondary-foreground px-5 py-2.5 rounded-lg hover:bg-secondary/80 flex items-center gap-2 transition-all shadow-sm hover:shadow-md text-sm font-medium"
              >
                View Generated Assets →
              </Link>
            </div>
          ) : (
            <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-bold tracking-wide">
              <Sparkles className="w-5 h-5" />
              Interview Concluded
            </div>
          )
        ) : (
          <button 
            onClick={handleGenerateAssets}
            disabled={isGenerating || messages.length < 3}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 text-sm font-medium"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            End Interview & Generate Assets
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6 h-full min-h-0">
        
        {/* Left Column: Expert Profile */}
        <div className="col-span-3 bg-card border border-border rounded-2xl p-6 overflow-y-auto shadow-sm relative overflow-hidden">
          <ExpertProfile 
            name={sessionData?.expert_name || "Unknown Expert"}
            department={sessionData?.department || "General"}
            role={sessionData?.role || "Professional"}
            experience={sessionData?.experience || "N/A"}
            expertise={sessionData?.expertise ? sessionData.expertise.split(',').map((s: string) => s.trim()) : []}
          />
        </div>

        {/* Center Column: AI Interviewer */}
        <div className="col-span-6 bg-card border border-border rounded-2xl p-1 flex flex-col shadow-sm relative overflow-hidden group">
          {/* Subtle gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="flex-1 min-h-0 bg-background/50 rounded-xl m-1 p-4 flex flex-col relative z-10">
            <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isListening || isSpeaking ? 'bg-emerald-400' : 'bg-muted'}`}></span>
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isListening || isSpeaking ? 'bg-emerald-500' : 'bg-muted-foreground'}`}></span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-none">Active Session</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                    {isListening || isSpeaking ? "Recording in progress" : (messages.length > 0 ? "Recording paused" : "Ready to Start")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSpeaking && (
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                    <Play className="w-3 h-3 fill-primary" /> BoomerBot Speaking
                  </span>
                )}
                {isListening && (
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                    <Mic className="w-3 h-3" /> Listening
                  </span>
                )}
              </div>
            </div>
            
            {isGenerating ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4] }} 
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="w-full max-w-md space-y-4"
                >
                  <div className="flex items-center gap-3 mb-8 justify-center">
                    <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    <h3 className="text-lg font-bold text-primary">Drafting Knowledge Assets...</h3>
                  </div>
                  <div className="h-6 bg-muted rounded-md w-3/4 mx-auto mb-6"></div>
                  <div className="h-3 bg-muted rounded-md w-full"></div>
                  <div className="h-3 bg-muted rounded-md w-full"></div>
                  <div className="h-3 bg-muted rounded-md w-5/6"></div>
                  <div className="h-3 bg-muted rounded-md w-full mt-4"></div>
                  <div className="h-3 bg-muted rounded-md w-4/5"></div>
                  <div className="h-3 bg-muted rounded-md w-full"></div>
                  <div className="h-3 bg-muted rounded-md w-2/3 mt-4"></div>
                </motion.div>
              </div>
            ) : (
              <ChatInterface 
                messages={messages} 
                isThinking={isThinking} 
                interimText={speechBuffer ? `${speechBuffer} ${interimText}` : interimText} 
                aiStreamingText={aiStreamingText}
                aiStateMsg={aiStateMsg}
                expertName={sessionData?.expert_name?.split(' ')[0] || "Expert"} 
              />
            )}
            
            {sessionData?.status !== 'completed' && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-6 shrink-0">
                <div className="h-8 flex-1 max-w-[160px]">
                  <AudioVisualizer isActive={isListening || isSpeaking} color={isSpeaking ? "primary" : "secondary"} />
                </div>
                
                <div className="flex flex-col items-center gap-1.5">
                  {messages.length === 0 ? (
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                          wsRef.current.send(JSON.stringify({ type: "start_session" }));
                        }
                      }}
                      className="bg-primary text-primary-foreground px-8 py-3 rounded-full hover:bg-primary/90 flex items-center gap-2 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 font-bold uppercase tracking-wider"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      Start Session
                    </motion.button>
                  ) : (
                    <>
                      <div className="relative">
                        {(isListening || isSpeaking) && (
                          <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className={`absolute inset-0 rounded-full ${isSpeaking ? 'bg-primary' : 'bg-destructive'}`}
                          />
                        )}
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={toggleListening}
                          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all relative z-10 ${
                            isListening 
                              ? 'bg-destructive text-destructive-foreground shadow-destructive/20 hover:shadow-destructive/40' 
                              : 'bg-gradient-to-br from-primary to-orange-600 text-white shadow-primary/20 hover:shadow-primary/40'
                          }`}
                        >
                          {isListening ? (
                            <Square className="w-5 h-5 fill-current" />
                          ) : (
                            <Mic className="w-6 h-6" />
                          )}
                        </motion.button>
                      </div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70">
                        {isListening ? "Stop Recording" : "Start Speaking"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Extraction */}
        <div className="col-span-3 bg-card border border-border rounded-2xl p-1 overflow-hidden shadow-sm flex flex-col">
          <div className="flex-1 min-h-0 bg-background/50 rounded-xl m-1 p-5 flex flex-col">
            <h3 className="font-semibold text-sm mb-4 text-primary flex items-center justify-between border-b border-border/50 pb-4 shrink-0">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Live Extraction
              </span>
            </h3>
            <LiveExtraction coverage={coverage} insights={insights} gaps={gaps} />
          </div>
        </div>

      </div>
    </div>
  );
}
