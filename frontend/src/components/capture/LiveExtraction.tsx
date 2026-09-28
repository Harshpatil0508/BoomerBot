import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Lightbulb, Zap, TrendingUp } from 'lucide-react';

interface ExtractedInsight {
  id: string;
  category: string;
  content: string;
  type: 'process' | 'tacit' | 'gap';
}

interface LiveExtractionProps {
  coverage: number;
  insights: ExtractedInsight[];
  gaps?: ExtractedInsight[];
}

export default function LiveExtraction({ coverage, insights, gaps = [] }: LiveExtractionProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Coverage Meter */}
      <div className="space-y-3 shrink-0 p-3.5 mb-4 rounded-xl bg-background/50 border border-border/50">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Knowledge Coverage</span>
          </div>
          <motion.span 
            key={coverage}
            initial={{ scale: 1.2, color: 'hsl(var(--primary))' }}
            animate={{ scale: 1, color: 'hsl(var(--foreground))' }}
            className="text-2xl font-bold"
          >
            {coverage}%
          </motion.span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-orange-400 relative"
            initial={{ width: 0 }}
            animate={{ width: `${coverage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -translate-x-full" />
          </motion.div>
        </div>
      </div>

      {/* Insights and gaps share a single scroll area so neither is capped to a fixed slice */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 space-y-5">

      {/* Insights List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border/50 pb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Captured Insights</h3>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
            {insights.length}
          </span>
        </div>
        
        <div className="space-y-2.5">
          <AnimatePresence initial={false}>
            {insights.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex flex-col items-center justify-center text-muted-foreground py-10"
              >
                <Zap className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">Listening for insights...</p>
                <p className="text-xs opacity-60 text-center max-w-[200px] mt-1">
                  Start the interview to begin live extraction.
                </p>
              </motion.div>
            ) : (
              insights.map((insight) => (
                <motion.div
                  key={insight.id}
                  layout
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  className={`p-3 rounded-xl border relative overflow-hidden group ${
                    insight.type === 'tacit' 
                      ? 'bg-violet-500/5 border-violet-500/20 hover:border-violet-500/40' 
                      : insight.type === 'gap' 
                        ? 'bg-destructive/5 border-destructive/20 hover:border-destructive/40' 
                        : 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
                  } transition-colors`}
                >
                  <div className="flex items-start gap-3 relative z-10">
                    <div className={`mt-0.5 shrink-0 ${
                      insight.type === 'process' ? 'text-emerald-400' :
                      insight.type === 'tacit' ? 'text-violet-400' :
                      'text-destructive'
                    }`}>
                      {insight.type === 'process' && <CheckCircle2 className="w-4 h-4" />}
                      {insight.type === 'tacit' && <Lightbulb className="w-4 h-4" />}
                      {insight.type === 'gap' && <AlertCircle className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                        insight.type === 'process' ? 'text-emerald-400/80' :
                        insight.type === 'tacit' ? 'text-violet-400/80' :
                        'text-destructive/80'
                      }`}>
                        {insight.type === 'tacit' ? 'Tacit Knowledge' : insight.category}
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed break-words">{insight.content}</p>
                    </div>
                  </div>
                  
                  {/* Subtle background glow on hover */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity ${
                    insight.type === 'process' ? 'bg-emerald-500' :
                    insight.type === 'tacit' ? 'bg-violet-500' :
                    'bg-destructive'
                  }`} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Knowledge Gaps */}
      {gaps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <h3 className="text-xs font-semibold text-destructive uppercase tracking-widest flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Knowledge Gaps
            </h3>
            <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
              {gaps.length}
            </span>
          </div>
          
          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {gaps.map((gap) => (
                <motion.div
                  key={gap.id}
                  layout
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  className="p-3 rounded-xl border relative overflow-hidden group bg-destructive/5 border-destructive/20 hover:border-destructive/40 transition-colors"
                >
                  <div className="flex items-start gap-3 relative z-10">
                    <div className="mt-0.5 shrink-0 text-destructive">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-destructive/80">
                        {gap.category}
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed break-words">{gap.content}</p>
                    </div>
                  </div>
                  
                  {/* Subtle background glow on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-destructive" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      </div>
      
      {/* Global shimmer animation definition (needs to be in CSS eventually, but using arbitrary class for now or inline style) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
}
