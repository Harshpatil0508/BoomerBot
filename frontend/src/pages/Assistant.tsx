import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, BookOpen, Brain, Sparkles, ArrowDown, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; asset_type: string; domain: string }[];
  exact_quotes?: string[];
  documents?: string[];
}

const SUGGESTED_QUESTIONS = [
  "What is the standard operating procedure for our main workflow?",
  "How do I troubleshoot common errors or issues?",
  "Who are the key experts for recent knowledge sessions?",
  "Can you summarize the most recently captured organizational knowledge?",
];

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { token } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<{ quotes: string[], docs: string[] } | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sendMessage = async (query: string) => {
    if (!query.trim() || isTyping) return;
    
    setInput("");
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await fetch("http://localhost:8000/api/assistant/query", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: data.answer,
        sources: data.sources,
        exact_quotes: data.exact_quotes,
        documents: data.documents
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't reach the knowledge base. Please make sure the backend server is running.",
        sources: []
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Simple markdown rendering for assistant messages
  const renderContent = (text: string) => {
    return text
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-4 mb-1">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-5 mb-2">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      .replace(/\[Source: (.*?)\]/g, '<span class="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">📄 $1</span>')
      .replace(/^\- (.*$)/gm, '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal text-sm leading-relaxed">$1</li>')
      .replace(/\n\n/g, '<br/>')
      .replace(/---/g, '<hr class="border-border my-3"/>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  };

  const highlightQuotes = (text: string, quotes: string[]) => {
    let highlightedText = text;
    quotes.forEach(quote => {
      if (quote.trim().length > 10) {
        // Escape special regex characters in the quote
        const escapedQuote = quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuote})`, 'gi');
        highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 font-semibold rounded px-1 py-0.5">$1</mark>');
      }
    });
    return highlightedText;
  };

  const escapeHtml = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const renderSourceMarkdown = (text: string) =>
    text
      .replace(/^\s*###\s+(.*)$/gm, '<h3 class="text-sm font-bold text-foreground mt-4 mb-1">$1</h3>')
      .replace(/^\s*##\s+(.*)$/gm, '<h2 class="text-base font-bold text-foreground mt-5 mb-2">$1</h2>')
      .replace(/^\s*#\s+(.*)$/gm, '<h1 class="text-lg font-bold text-foreground mt-5 mb-2">$1</h1>')
      .replace(/^\s*(?:---|\*\*\*|___)\s*$/gm, '<hr class="border-border my-4"/>')
      .replace(/^\s*[-*\u2022]\s+(.*)$/gm, '<li class="ml-5 list-disc mb-1">$1</li>')
      .replace(/^\s*\d+\.\s+(.*)$/gm, '<li class="ml-5 list-decimal mb-1">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`\n]+)`/g, '<code class="px-1 py-0.5 rounded bg-secondary text-xs">$1</code>')
      // Collapse newlines around block-level tags so they do not add stray gaps
      .replace(/\n+(?=<(?:h[1-3]|li|hr))/g, '')
      .replace(/(<\/(?:h[1-3]|li)>|<hr[^>]*\/>)\n+/g, '$1')
      .replace(/\n{2,}/g, '<div class="h-3"></div>')
      .replace(/\n/g, '<br/>');

  const renderSourceContext = (docs: string[], quotes: string[]) => {
    const escapedQuotes = quotes.map(escapeHtml);
    return docs
      .map(doc => renderSourceMarkdown(highlightQuotes(escapeHtml(doc), escapedQuotes)))
      .join('<hr class="border-border my-5"/>');
  };

  return (
    <div className="h-full flex flex-col max-w-6xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-4 shrink-0"
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <Brain className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">Knowledge Assistant</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Ask questions about preserved organizational expertise
        </p>
      </motion.div>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 relative transition-all duration-300">
        
        {/* Chat Area */}
        <div className="flex-1 bg-card border border-border rounded-xl flex flex-col shadow-sm min-h-0 relative transition-all duration-300">
          <div 
            ref={scrollRef} 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="min-h-full flex flex-col items-center justify-center py-4"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shrink-0">
                <Sparkles className="w-10 h-10 text-primary/60" />
              </div>
              <h3 className="text-lg font-semibold mb-2">What would you like to know?</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                I can answer questions based on knowledge preserved from expert interviews. Try one of these:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    onClick={() => sendMessage(q)}
                    className="text-left p-4 rounded-xl border border-border bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all text-sm text-muted-foreground hover:text-foreground group"
                  >
                    <span className="flex items-start gap-2">
                      <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-primary/50 group-hover:text-primary transition-colors" />
                      {q}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* Role label */}
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
                    {msg.role === 'user' ? 'You' : 'BoomerBot'}
                  </span>

                  {/* Message bubble */}
                  <div 
                    className={`relative max-w-[85%] p-4 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-secondary/80 text-secondary-foreground rounded-tl-sm border border-border/50'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div 
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                      />
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}

                    {/* Copy button for assistant messages */}
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-md hover:bg-background/30 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 max-w-[85%]"
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <BookOpen className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Sources</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((s, i) => (
                          <span 
                            key={i}
                            onClick={() => navigate(`/assets?search=${encodeURIComponent(s.title)}`)}
                            className="inline-flex items-center gap-1 text-[11px] bg-background border border-border rounded-md px-2 py-1 text-muted-foreground hover:text-primary hover:border-primary/50 cursor-pointer transition-colors"
                            title="View this source document"
                          >
                            <BookOpen className="w-3 h-3 text-primary/60" />
                            {s.title}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Exact Quotes (Citations) */}
                  {msg.exact_quotes && msg.exact_quotes.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 max-w-[85%] bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3"
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-2">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500" />
                          <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase tracking-wider">Exact Citations</span>
                        </div>
                        {msg.documents && msg.documents.length > 0 && (
                          <button 
                            onClick={() => setSelectedCitation({ quotes: msg.exact_quotes!, docs: msg.documents! })}
                            className="text-[10px] bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30 px-2 py-1 rounded transition-colors"
                          >
                            View Source Context
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {msg.exact_quotes.map((quote, i) => (
                          <div key={i} className="text-xs text-muted-foreground italic border-l-2 border-yellow-500/50 pl-2">
                            "{quote}"
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-start"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
                    BoomerBot
                  </span>
                  <div className="flex items-center gap-1.5 p-4 bg-secondary/80 rounded-2xl rounded-tl-sm border border-border/50">
                    <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} />
                    <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} />
                    <motion.div className="w-2 h-2 bg-primary/60 rounded-full" animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} />
                    <span className="text-xs text-muted-foreground ml-2">Searching knowledge base...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 p-2 rounded-full bg-card border border-border shadow-lg hover:bg-secondary transition-colors z-10"
            >
              <ArrowDown className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
        
        {/* Input area */}
        <form onSubmit={handleSubmit} className="relative px-4 pb-4 pt-2 border-t border-border/50 shrink-0">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about preserved organizational knowledge..." 
              className="w-full bg-background border border-border rounded-xl pl-4 pr-14 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-shadow"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-2.5 bg-primary rounded-lg text-primary-foreground disabled:opacity-30 hover:bg-primary/90 transition-all disabled:hover:bg-primary"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
            Answers are generated from preserved expert knowledge using RAG retrieval
          </p>
        </form>
        </div>

        {/* Citation Split Pane */}
        <AnimatePresence>
          {selectedCitation && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full lg:w-[40%] xl:w-[33%] bg-card border border-border rounded-xl flex flex-col shadow-sm overflow-hidden min-h-0 shrink-0"
            >
              <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/30">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold">Source Context</h3>
                </div>
                <button 
                  onClick={() => setSelectedCitation(null)}
                  className="text-xs text-muted-foreground hover:text-foreground p-1"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 text-sm text-muted-foreground leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: renderSourceContext(selectedCitation.docs, selectedCitation.quotes) }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
