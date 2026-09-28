import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Message {
  id: string;
  role: 'expert' | 'ai';
  content: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  isThinking: boolean;
  interimText: string;
  aiStreamingText?: string;
  expertName?: string;
  aiStateMsg?: string;
}

export default function ChatInterface({ messages, isThinking, interimText, aiStreamingText, expertName = "Expert", aiStateMsg = "Thinking..." }: ChatInterfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isThinking, interimText]);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4 bg-background/50 rounded-xl border border-border/50 relative">
      <AnimatePresence initial={false}>
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex flex-col max-w-[85%] ${msg.role === 'expert' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
              {msg.role === 'expert' ? `${expertName} (Expert)` : 'BoomerBot'}
            </span>
            <div 
              className={`p-4 rounded-2xl relative shadow-sm ${
                msg.role === 'expert' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-card text-card-foreground border border-border rounded-tl-sm'
              }`}
            >
              {msg.role === 'ai' && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl rounded-tl-sm pointer-events-none" />
              )}
              <span className="relative z-10 text-sm leading-relaxed">{msg.content}</span>
            </div>
          </motion.div>
        ))}

        {interimText && (
          <motion.div
            key="interim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col max-w-[85%] ml-auto items-end"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">{expertName} (Expert)</span>
            <div className="p-4 rounded-2xl bg-primary/40 text-primary-foreground border border-primary/20 rounded-tr-sm italic">
              <span className="text-sm leading-relaxed">{interimText}...</span>
            </div>
          </motion.div>
        )}

        {isThinking && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col max-w-[85%] mr-auto items-start"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">BoomerBot</span>
            <div className="p-4 rounded-2xl bg-card border border-border rounded-tl-sm">
              <div className="flex space-x-2 items-center">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-medium text-muted-foreground ml-2 animate-pulse">{aiStateMsg}</span>
              </div>
            </div>
          </motion.div>
        )}

        {aiStreamingText && (
          <motion.div
            key="ai-streaming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col max-w-[85%] mr-auto items-start"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
              BoomerBot
            </span>
            <div className="p-4 rounded-2xl relative shadow-sm bg-card text-card-foreground border border-border rounded-tl-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl rounded-tl-sm pointer-events-none" />
              <span className="relative z-10 text-sm leading-relaxed">
                {aiStreamingText.split(' ').map((word, i) => (
                  <motion.span 
                    key={i} 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.1 }}
                    className="inline-block mr-1"
                  >
                    {word}
                  </motion.span>
                ))}
              </span>
              <motion.span 
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="inline-block w-1.5 h-4 ml-1 bg-primary relative top-1"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
