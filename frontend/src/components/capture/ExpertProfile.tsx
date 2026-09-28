import { motion } from 'framer-motion';
import { User, Briefcase, Award, Tags, Edit3 } from 'lucide-react';

interface ExpertProfileProps {
  name: string;
  department: string;
  role: string;
  experience: string;
  expertise: string[];
}

export default function ExpertProfile({ name, department, role, experience, expertise }: ExpertProfileProps) {
  return (
    <div className="flex flex-col h-full relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -mr-6 -mt-6 blur-2xl pointer-events-none" />
      
      <div className="mb-6 pb-6 border-b border-border/50 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-orange-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg shadow-primary/20">
            {name.split(' ').map(n => n[0]).join('')}
          </div>
          <button className="p-2 bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors">
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
        <h2 className="text-xl font-bold tracking-tight">{name}</h2>
        <p className="text-primary font-medium text-sm mt-0.5">{role}</p>
      </div>

      <div className="space-y-5 relative z-10">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
          <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold block mb-0.5">Department</label>
            <div className="font-medium text-sm">{department}</div>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
          <Award className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold block mb-0.5">Experience</label>
            <div className="font-medium text-sm">{experience}</div>
          </div>
        </div>
        
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <Tags className="w-4 h-4 text-muted-foreground" />
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Areas of Expertise</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {expertise.map(area => (
              <span key={area} className="px-2.5 py-1 rounded-md bg-secondary text-xs font-medium border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-default">
                {area}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-6 relative z-10">
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Expert Status</span>
          </div>
          <p className="text-xs text-muted-foreground">Profile verified and ready for knowledge capture.</p>
        </div>
      </div>
    </div>
  );
}
