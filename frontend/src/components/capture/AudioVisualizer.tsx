import { motion } from 'framer-motion';

interface AudioVisualizerProps {
  isActive: boolean;
  color?: "primary" | "secondary";
}

export default function AudioVisualizer({ isActive, color = "primary" }: AudioVisualizerProps) {
  const bars = 7; // Increased number of bars for a better look
  
  return (
    <div className="flex items-center justify-center gap-1.5 h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className={`w-1.5 rounded-full ${color === 'primary' ? 'bg-primary' : 'bg-muted-foreground/40'}`}
          animate={isActive ? {
            height: ["20%", "70%", "100%", "40%", "80%", "20%"]
          } : {
            height: "20%"
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: i * 0.1
          }}
          style={{ height: "20%" }}
        />
      ))}
    </div>
  );
}
