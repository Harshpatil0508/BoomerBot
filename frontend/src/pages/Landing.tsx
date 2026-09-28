import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { 
  Mic, BrainCircuit, FileText, ChevronRight, 
  ShieldCheck, Zap, Database, CheckCircle2,
  Moon, Sun, ArrowRight, UploadCloud, MessageSquare,
  Network, ShieldAlert, Brain
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import MagneticButton from '../components/MagneticButton';

const TypingSimulation = () => {
  const messages = [
    "Generating Markdown SOP from transcript...",
    "Extracting tacit knowledge from expert...",
    "Compiling Q&A pairs for the Knowledge Base...",
    "Analyzing voice sentiment and context...",
    "Synthesizing enterprise documentation..."
  ];

  const [displayedText, setDisplayedText] = useState("");
  const [messageIndex, setMessageIndex] = useState(0);
  
  useEffect(() => {
    let i = 0;
    let currentMessage = messages[messageIndex];
    let isWaiting = false;

    const interval = setInterval(() => {
      if (isWaiting) return;
      
      setDisplayedText(currentMessage.substring(0, i));
      i++;
      
      if (i > currentMessage.length) {
        isWaiting = true;
        setTimeout(() => {
          isWaiting = false;
          setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 2000);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [messageIndex]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="absolute top-32 left-10 hidden xl:flex items-center gap-3 bg-background/80 backdrop-blur-md border border-border p-4 rounded-xl shadow-2xl z-30 pointer-events-auto"
    >
      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      <span className="font-mono text-sm">{displayedText}<span className="animate-blink">|</span></span>
    </motion.div>
  );
};

const LivePipelineFlow = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { icon: UploadCloud, label: "Document Upload", desc: "Extracting metadata and technical domains from resume." },
    { icon: Mic, label: "AI Interview", desc: "Real-time speech-to-text processing and LangGraph state management." },
    { icon: FileText, label: "Asset Gen", desc: "Synthesizing tacit knowledge into structured Markdown." },
    { icon: Database, label: "Knowledge Base", desc: "Vectorizing and securely indexing documentation." },
    { icon: MessageSquare, label: "Chatbot", desc: "RAG-powered conversational interface for instant retrieval." }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="absolute bottom-0 left-0 w-full px-6 pb-8 z-30 hidden lg:block">
      <div className="max-w-5xl mx-auto relative px-4 md:px-12 py-8 bg-background/60 backdrop-blur-lg rounded-3xl border border-border/50 shadow-2xl">
        {/* Background Track Line */}
        <div className="absolute top-1/2 left-12 right-12 h-1 bg-border/50 z-0 hidden md:block -translate-y-1/2" />
        
        {/* Animated Progress Line */}
        <div className="absolute top-1/2 left-12 right-12 h-1 z-0 hidden md:block overflow-hidden -translate-y-1/2">
          <motion.div 
            className="h-full bg-primary shadow-[0_0_15px_rgba(234,88,12,0.5)]"
            animate={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </div>

        {/* Moving Particles */}
        <div className="absolute top-1/2 left-12 right-12 h-1 z-0 hidden md:block -translate-y-1/2 pointer-events-none">
          <motion.div 
            className="absolute top-1/2 w-8 h-1 bg-gradient-to-r from-transparent to-primary -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(234,88,12,1)]"
            animate={{ left: ["0%", "100%"] }}
            transition={{ duration: 3, ease: "linear", repeat: Infinity }}
          />
          <motion.div 
            className="absolute top-1/2 w-8 h-1 bg-gradient-to-r from-transparent to-primary -translate-y-1/2 rounded-full shadow-[0_0_10px_rgba(234,88,12,1)]"
            animate={{ left: ["0%", "100%"] }}
            transition={{ duration: 3, ease: "linear", repeat: Infinity, delay: 1.5 }}
          />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-12 md:gap-0 relative z-10">
          {steps.map((step, i) => {
            const isActive = i === activeStep;
            const isPast = i <= activeStep;
            
            return (
              <div key={i} className="flex flex-col items-center gap-4 relative group">
                {/* Node */}
                <motion.div 
                  animate={{ 
                    scale: isActive ? 1.15 : 1,
                    borderColor: isPast ? "hsl(var(--primary))" : "hsl(var(--border) / 0.5)",
                    backgroundColor: isActive ? "hsl(var(--primary) / 0.15)" : isPast ? "hsl(var(--primary) / 0.05)" : "hsl(var(--background) / 0.8)"
                  }}
                  className="w-16 h-16 rounded-2xl border flex items-center justify-center transition-colors duration-500 relative z-10 backdrop-blur-md shadow-lg"
                >
                  <step.icon className={`w-7 h-7 transition-colors duration-500 ${isPast ? "text-primary" : "text-muted-foreground opacity-50"}`} />
                  
                  {isActive && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  )}
                </motion.div>
                
                {/* Label */}
                <span className={`font-bold text-xs uppercase tracking-wider transition-colors duration-500 mt-2 ${isActive ? "text-primary" : isPast ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.label}
                </span>

                {/* Tooltip */}
                <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-48 p-3 rounded-lg bg-background/90 backdrop-blur-md border border-border shadow-xl z-20 pointer-events-none text-left hidden md:block">
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
};

const Marquee = () => {
  const items = [
    "300+ Hours Saved", "•", "Tacit Knowledge Captured", "•",
    "SOPs Generated Instantly", "•", "Zero Context Lost", "•",
    "Enterprise Secure", "•"
  ];
  return (
    <div className="w-full bg-primary/5 border-y border-border py-3 overflow-hidden flex whitespace-nowrap z-20 relative">
      <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <motion.div 
        className="flex gap-12 items-center"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 20, ease: "linear", repeat: Infinity }}
      >
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span key={i} className={`text-sm font-semibold tracking-widest uppercase ${item === "•" ? "text-primary" : "text-muted-foreground"}`}>
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

const LiveChatPreview = () => {
  const [messages, setMessages] = useState<number>(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages(prev => prev >= 3 ? 0 : prev + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-sm mx-auto bg-card border border-border rounded-2xl shadow-2xl overflow-hidden mt-12 md:mt-0">
      <div className="bg-muted px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs font-medium text-muted-foreground flex-1 text-center pr-8">Ask BoomerBot</span>
      </div>
      <div className="p-4 space-y-4 h-[250px] flex flex-col justify-end text-left">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-end gap-2 justify-end"
        >
          <div className="bg-primary text-primary-foreground text-sm p-3 rounded-2xl rounded-br-sm max-w-[80%]">
            How do we configure the legacy mainframes?
          </div>
        </motion.div>
        {messages >= 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2"
          >
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0 mt-1">
              <BrainCircuit className="w-3 h-3 text-primary-foreground" />
            </div>
            <div className="bg-muted text-foreground text-sm p-3 rounded-2xl rounded-bl-sm max-w-[85%]">
              {messages === 1 ? (
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0.4s" }} />
                </span>
              ) : (
                "Based on Dave's SOP from 1998, you need to first reset the optical drives. Here is the step-by-step..."
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const UploadPreview = () => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="w-full max-w-[280px] md:max-w-sm border-2 border-dashed border-primary/30 rounded-2xl p-6 flex flex-col items-center gap-4 bg-background/80 relative overflow-hidden shadow-2xl backdrop-blur-md"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <UploadCloud className="w-12 h-12 text-primary" />
        </motion.div>
        <p className="font-semibold text-foreground">Drag & Drop Resume</p>
        
        {/* Fake File Uploaded */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full p-3 bg-primary/10 rounded-lg flex items-center gap-3 border border-primary/20"
        >
          <FileText className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <div className="h-2 w-24 bg-primary/30 rounded mb-1"></div>
            <div className="h-2 w-full bg-primary/20 rounded overflow-hidden">
              <motion.div 
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, delay: 0.8 }}
                className="h-full bg-primary"
              />
            </div>
          </div>
        </motion.div>

        {/* Extracted Tags */}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          <motion.span 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.5 }}
            className="px-2 py-1 text-[10px] md:text-xs font-bold bg-blue-500/20 text-blue-500 rounded-md"
          >
            Systems Arch
          </motion.span>
          <motion.span 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.7 }}
            className="px-2 py-1 text-[10px] md:text-xs font-bold bg-emerald-500/20 text-emerald-500 rounded-md"
          >
            Backend
          </motion.span>
          <motion.span 
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.9 }}
            className="px-2 py-1 text-[10px] md:text-xs font-bold bg-purple-500/20 text-purple-500 rounded-md"
          >
            15 Yrs
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
};

const VoiceInterviewPreview = () => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="w-full max-w-[280px] md:max-w-sm flex flex-col gap-6"
      >
        {/* Waveform */}
        <div className="flex items-center justify-center gap-1.5 h-16 bg-background/50 backdrop-blur-md rounded-full px-6 shadow-xl border border-border">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ height: ["20%", "100%", "30%", "80%", "20%"] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1, ease: "easeInOut" }}
              className="w-1.5 bg-primary rounded-full"
            />
          ))}
        </div>

        {/* Chat Bubbles */}
        <div className="flex flex-col gap-3 w-full">
          <motion.div 
            initial={{ opacity: 0, x: -20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-primary/20 p-4 rounded-2xl rounded-tl-sm self-start text-[13px] md:text-sm max-w-[85%] border border-primary/30 text-foreground shadow-lg backdrop-blur-md"
          >
            "Could you walk me through the database migration process?"
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20, y: 10 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 2 }}
            className="bg-card p-4 rounded-2xl rounded-tr-sm self-end text-[13px] md:text-sm max-w-[85%] border border-border text-foreground shadow-lg backdrop-blur-md"
          >
            "Sure, first we always lock the primary node to prevent writes..."
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

const AssetGenerationPreview = () => {
  return (
    <div className="absolute inset-0 flex flex-col md:flex-row gap-4 p-4 md:p-8 items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex-1 w-full max-w-[300px] bg-card rounded-xl border border-border overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="bg-muted px-3 py-1.5 text-[10px] md:text-xs font-medium border-b border-border text-muted-foreground flex items-center gap-2">
          <MessageSquare className="w-3 h-3" /> Raw Transcript
        </div>
        <div className="p-4 text-[10px] md:text-[11px] font-mono text-muted-foreground leading-relaxed h-32 md:h-48 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card z-10 pointer-events-none" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            Interviewer: "Could you walk me through the database migration process?"<br/><br/>
            Expert: "Sure, first we always lock the primary node to prevent writes. Then we take a snapshot."
          </motion.div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="flex-1 w-full max-w-[300px] bg-card rounded-xl border border-border overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="bg-primary/10 px-3 py-1.5 text-[10px] md:text-xs font-bold border-b border-primary/20 text-primary flex items-center gap-2">
          <FileText className="w-3 h-3" /> SOP.md
        </div>
        <div className="p-4 h-32 md:h-48">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="space-y-3"
          >
            <div className="h-4 w-3/4 bg-primary/20 rounded font-bold"></div>
            <div className="h-2 w-full bg-border rounded mt-4"></div>
            <div className="h-2 w-5/6 bg-border rounded"></div>
            <div className="flex gap-2 items-center mt-4">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
              <div className="h-2 w-2/3 bg-border rounded"></div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
              <div className="h-2 w-1/2 bg-border rounded"></div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

const KnowledgePipeline = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  const steps = [
    {
      id: "01",
      title: "Context Ingestion",
      desc: "The expert uploads their resume. Our system extracts core domains and builds a dynamic, highly-targeted interview strategy.",
      icon: UploadCloud,
      gradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-500"
    },
    {
      id: "02",
      title: "AI Voice Interview",
      desc: "The expert has a casual, voice-first conversation. Our dual-agent architecture extracts insights in the background without interrupting.",
      icon: Mic,
      gradient: "from-primary/20 to-orange-400/20",
      iconColor: "text-primary"
    },
    {
      id: "03",
      title: "Asset Generation",
      desc: "Using RAG, the raw transcript is automatically synthesized into production-ready Markdown SOPs and FAQs.",
      icon: FileText,
      gradient: "from-emerald-500/20 to-teal-500/20",
      iconColor: "text-emerald-500"
    },
    {
      id: "04",
      title: "Knowledge Assistant",
      desc: "The preserved knowledge is instantly available to your entire organization through an interactive AI Chatbot.",
      icon: MessageSquare,
      gradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-500"
    }
  ];

  return (
    <section className="py-24 px-6 relative z-20">
      <div className="max-w-screen-xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">A seamless knowledge pipeline.</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">From unstructured human expertise to highly structured enterprise assets in minutes.</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-stretch">
          {/* Left Side: Tabs */}
          <div className="w-full lg:w-1/3 flex flex-col justify-center gap-2">
            {steps.map((step, i) => {
              const isActive = activeTab === i;
              return (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`text-left p-6 rounded-2xl transition-all duration-300 border ${isActive ? 'bg-card border-primary/50 shadow-lg lg:scale-105 relative z-10' : 'bg-transparent border-transparent hover:bg-card/50'}`}
                >
                  <div className="flex items-center gap-4 mb-2">
                    <span className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{step.id}</span>
                    <h3 className={`text-xl font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</h3>
                  </div>
                  {isActive && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-muted-foreground text-sm leading-relaxed ml-9"
                    >
                      {step.desc}
                    </motion.p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Side: Visuals */}
          <div className="w-full lg:w-2/3 min-h-[400px]">
            <div className={`relative w-full h-full rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center border border-border bg-gradient-to-br ${steps[activeTab].gradient} transition-colors duration-500`}>
              
              {/* Background Step Number */}
              <AnimatePresence mode="wait">
                <motion.div 
                  key={activeTab}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="absolute top-8 left-8 z-10"
                >
                  <span className="text-8xl md:text-9xl font-black text-foreground/5 drop-shadow-sm tracking-tighter">
                    {steps[activeTab].id}
                  </span>
                </motion.div>
              </AnimatePresence>

              {/* Dynamic Previews */}
              <AnimatePresence mode="wait">
                {activeTab === 0 && <UploadPreview key="0" />}
                {activeTab === 1 && <VoiceInterviewPreview key="1" />}
                {activeTab === 2 && <AssetGenerationPreview key="2" />}
                {activeTab === 3 && (
                  <motion.div 
                    key="3"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 flex items-center justify-center p-4"
                  >
                    <div className="transform scale-90 w-full flex justify-center">
                      <LiveChatPreview />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const EngineRoom = () => {
  const features = [
    {
      icon: Network,
      title: "Cognitive State-Machine",
      desc: "Powered by LangGraph, our AI interviewer doesn't just read scripts. It maps processes, actively hunts for edge cases, and self-critiques its own questions in real-time.",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "hover:border-blue-500/50 hover:shadow-blue-500/10"
    },
    {
      icon: ShieldAlert,
      title: "Proactive Risk Scanner",
      desc: "Our anomaly detector correlates HR data with knowledge assets to flag critical vulnerabilities, like retiring experts who haven't been interviewed or RBAC security violations.",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "hover:border-emerald-500/50 hover:shadow-emerald-500/10"
    },
    {
      icon: Brain,
      title: "Infinite Context Memory",
      desc: "A dedicated background AI continuously compresses and condenses the interview transcript, meaning the voice agent never loses conversational context, even after hours of talking.",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "hover:border-purple-500/50 hover:shadow-purple-500/10"
    },
    {
      icon: Zap,
      title: "Zero-Touch Extraction",
      desc: "While the expert is still speaking, our extraction engine instantly rips the raw audio transcript into structured JSON, vectorizing tacit wisdom without human intervention.",
      color: "text-primary",
      bg: "bg-primary/10",
      border: "hover:border-primary/50 hover:shadow-primary/10"
    }
  ];

  return (
    <section className="py-32 px-6 bg-background relative z-20 overflow-hidden border-y border-border">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      
      <div className="max-w-screen-xl mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-sm font-bold text-primary tracking-widest uppercase mb-3">The Engine Room</h2>
          <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight">Enterprise-Grade Architecture.</h3>
          <p className="text-xl text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
            BoomerBot is more than a chatbot. It's a highly sophisticated cognitive pipeline designed for massive enterprise scale.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className={`p-10 rounded-3xl bg-card border border-border/50 shadow-xl transition-all duration-300 group ${f.border}`}
            >
              <div className={`w-16 h-16 rounded-2xl ${f.bg} flex items-center justify-center mb-8 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                <f.icon className={`w-8 h-8 ${f.color}`} />
              </div>
              <h4 className="text-2xl font-bold mb-4">{f.title}</h4>
              <p className="text-muted-foreground leading-relaxed text-lg">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 selection:bg-primary/20 overflow-hidden">
      
      {/* Scroll Progress */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1.5 bg-primary z-[60] origin-left glow-primary"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border transition-colors duration-300">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm glow-primary">
              <BrainCircuit className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              BoomerBot
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link 
              to="/login"
              className="px-5 py-2 rounded-lg bg-foreground text-background hover:opacity-90 text-sm font-semibold transition-all shadow-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with Parallax Background */}
      <section className="relative pt-32 pb-56 px-6 min-h-screen flex flex-col items-center justify-center text-center">
        {/* Background Video */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/80 to-background z-10" />
          <motion.video 
            autoPlay 
            loop 
            muted 
            playsInline
            style={{ y: heroY }}
            src="/tech_bg.mp4" 
            className="w-full h-full object-cover opacity-40 dark:opacity-30 dark:invert-0 invert mix-blend-luminosity scale-110"
          />
        </div>

        <motion.div 
          style={{ opacity: heroOpacity }} 
          className="relative z-20 max-w-5xl mx-auto flex flex-col items-center"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm mb-8"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Enterprise Knowledge Preservation Platform
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 leading-tight max-w-4xl mx-auto"
          >
            Don't let your experts <br className="hidden md:block" />
            <span className="text-gradient animate-text-shimmer">walk out the door.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="text-lg md:text-2xl text-muted-foreground mb-12 max-w-3xl leading-relaxed"
          >
            Capture the deep, undocumented knowledge of your retiring workforce. Our autonomous Voice AI interviews your experts and instantly generates structured enterprise SOPs.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="flex gap-4"
          >
            <MagneticButton>
              <Link 
                to="/login"
                className="px-8 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg transition-all glow-primary flex items-center justify-center gap-2 group hover:-translate-y-1"
              >
                Start Preserving Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </MagneticButton>
          </motion.div>
        </motion.div>
        <TypingSimulation />
        <LivePipelineFlow />
      </section>
      
      <Marquee />

      {/* The Problem (Bento Box) */}
      <section className="py-24 px-6 bg-secondary/30 border-y border-border relative z-20">
        <div className="max-w-screen-2xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="mb-16 max-w-3xl mx-auto text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">The Knowledge Crisis is here.</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Traditional knowledge transfer fails because experts hate writing documentation. Asking a 30-year veteran to stare at a blank Confluence page results in generic, high-level summaries. The real tacit knowledge is lost forever.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                icon: ShieldCheck, 
                title: "Zero Friction", 
                desc: "No typing required. The expert simply uploads their resume and answers natural questions." 
              },
              { 
                icon: Zap, 
                title: "Anti-Drift Technology", 
                desc: "Our LangGraph state machine forces the conversation to pivot, preventing the AI from getting stuck on tangents." 
              },
              { 
                icon: Database, 
                title: "Enterprise Secure", 
                desc: "100% of data is routed through secure OAuth2 LLM providers. No public model training." 
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 text-primary group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <KnowledgePipeline />

      {/* The Engine Room Section */}
      <EngineRoom />

      {/* CTA Section */}
      <section className="py-32 px-6 border-t border-border bg-background relative z-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl mx-auto rounded-3xl bg-card border border-border p-12 md:p-20 text-center relative overflow-hidden shadow-2xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <h2 className="text-3xl md:text-5xl font-semibold mb-6 relative z-10 tracking-tight">Ready to secure your legacy?</h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto relative z-10 leading-relaxed">
            Join forward-thinking enterprises turning retiring expertise into permanent, searchable knowledge bases.
          </p>
          <MagneticButton>
            <Link 
              to="/login"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-xl bg-primary text-primary-foreground font-bold text-lg transition-all hover:bg-primary/90 relative z-10 shadow-lg glow-primary hover:-translate-y-1"
            >
              Launch Platform <ArrowRight className="w-6 h-6" />
            </Link>
          </MagneticButton>
        </motion.div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground bg-background border-t border-border transition-colors duration-300 relative z-20">
        <p>© 2026 BoomerBot. All rights reserved.</p>
      </footer>
    </div>
  );
}
