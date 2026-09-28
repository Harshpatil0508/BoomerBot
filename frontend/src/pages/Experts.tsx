import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Briefcase, Plus, Sparkles, Trash2, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Experts() {
  const [experts, setExperts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expertToDelete, setExpertToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    fetch('http://localhost:8000/api/experts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setExperts(data);
        setIsLoading(false);
      })
      .catch(console.error);
  }, [token]);

  const initiateDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpertToDelete(id);
  };

  const confirmDelete = async () => {
    if (!expertToDelete) return;
    try {
      await fetch(`http://localhost:8000/api/experts/${expertToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setExperts(experts.filter(exp => exp.id !== expertToDelete));
    } catch (err) {
      console.error(err);
    } finally {
      setExpertToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between shrink-0 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Experts Directory
          </h2>
          <p className="text-muted-foreground mt-2">
            The company's preserved knowledge network.
          </p>
        </div>
        <button 
          onClick={() => navigate('/setup')}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 flex items-center gap-2 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40"
        >
          <Plus className="w-5 h-5" />
          Add New Expert
        </button>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search by name or email..." 
          className="w-full bg-card border border-border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : experts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border rounded-2xl shadow-sm p-12">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Experts Yet</h3>
          <p className="text-muted-foreground max-w-sm text-center mb-6">
            Start by uploading a knowledge document to initialize an expert profile and begin capturing their knowledge.
          </p>
          <button 
            onClick={() => navigate('/setup')}
            className="bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-secondary/80 transition-all"
          >
            Capture First Expert
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {experts.filter(exp => 
            exp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (exp.email && exp.email.toLowerCase().includes(searchQuery.toLowerCase()))
          ).map((expert, i) => (
            <Link key={expert.id} to={`/experts/${expert.id}`}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all cursor-pointer h-full flex flex-col relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                    {expert.name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-secondary text-secondary-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
                      {expert.session_count} Session{expert.session_count !== 1 ? 's' : ''}
                    </div>
                    <button 
                      onClick={(e) => initiateDelete(expert.id, e)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-1 line-clamp-1 relative z-10">{expert.name}</h3>
                <p className="text-sm font-medium text-primary mb-1 flex items-center gap-1.5 relative z-10">
                  <Briefcase className="w-4 h-4" />
                  {expert.role}
                </p>
                <p className="text-xs text-muted-foreground mb-4 relative z-10">
                  {expert.email}
                </p>
                
                <div className="mt-auto pt-4 border-t border-border/50 relative z-10">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Expertise</p>
                  <div className="flex flex-wrap gap-1.5">
                    {expert.expertise.split(',').slice(0, 3).map((skill: string, idx: number) => (
                      <span key={idx} className="bg-background text-foreground text-[10px] px-2 py-1 rounded-md border border-border">
                        {skill.trim()}
                      </span>
                    ))}
                    {expert.expertise.split(',').length > 3 && (
                      <span className="bg-background text-muted-foreground text-[10px] px-2 py-1 rounded-md border border-border">
                        +{expert.expertise.split(',').length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {expertToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-card border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-xl font-bold mb-2">Delete Expert</h3>
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this expert? All associated knowledge sessions, insights, and generated assets will be permanently lost. This action cannot be undone.
                </p>
              </div>
              <div className="p-4 border-t border-border bg-secondary/30 flex justify-end gap-3">
                <button 
                  onClick={() => setExpertToDelete(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-lg shadow-destructive/20"
                >
                  Delete Expert
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
