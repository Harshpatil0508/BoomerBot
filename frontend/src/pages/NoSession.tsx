import { motion } from 'framer-motion';
import { CalendarClock, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NoSession() {
  const { user } = useAuth();

  return (
    <div className="h-full flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl shadow-sm p-10 max-w-lg w-full text-center"
      >
        <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
          <CalendarClock className="w-10 h-10 text-primary/70" />
        </div>

        <h2 className="text-2xl font-bold mb-2">No interview scheduled</h2>
        <p className="text-muted-foreground mb-8">
          Thanks{user?.email ? `, ${user.email.split('@')[0]}` : ''} — all of your capture sessions are complete.
          An administrator will schedule a follow-up interview if more knowledge needs preserving.
        </p>

        <Link
          to="/assets"
          className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-5 py-3 rounded-xl font-semibold hover:bg-secondary/80 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          View my preserved knowledge
        </Link>
      </motion.div>
    </div>
  );
}
