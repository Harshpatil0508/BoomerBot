import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Search, Filter, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function KnowledgeAtRisk() {
  const [atRiskExperts, setAtRiskExperts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterIssue, setFilterIssue] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  const startFollowUp = async (expertId: string) => {
    setStartingId(expertId);
    try {
      const res = await fetch(`http://localhost:8000/api/experts/${expertId}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      const data = await res.json();

      if (res.status === 409) {
        navigate(`/capture/${data.detail.session_id}`);
        return;
      }
      if (!res.ok) throw new Error(data.detail || 'Could not start the session');

      navigate(`/capture/${data.session_id}`);
    } catch (err) {
      console.error(err);
      navigate(`/experts/${expertId}`);
    } finally {
      setStartingId(null);
    }
  };

  // Compute unique issues for the dropdown
  const uniqueIssues = ["All", ...new Set(atRiskExperts.map(exp => exp.risk_reason))];

  // Filter the experts
  const filteredExperts = atRiskExperts.filter(exp => {
    const matchesSearch = exp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          exp.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIssue = filterIssue === "All" || exp.risk_reason === filterIssue;
    return matchesSearch && matchesIssue;
  });

  useEffect(() => {
    fetch('http://localhost:8000/api/dashboard/at-risk', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setAtRiskExperts(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [token]);

  return (
    <div className="h-full flex flex-col max-w-[1600px] mx-auto p-6">
      <div className="flex items-center justify-between shrink-0 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            Knowledge at Risk
          </h2>
          <p className="text-muted-foreground mt-2">
            Experts holding critical knowledge with incomplete or missing capture sessions.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search by name or department..." 
            className="w-full bg-card border border-border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-destructive focus:border-transparent transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="relative max-w-xs w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-muted-foreground" />
          </div>
          <select
            className="w-full bg-card border border-border rounded-xl py-3 pl-12 pr-10 focus:outline-none focus:ring-2 focus:ring-destructive focus:border-transparent appearance-none transition-all shadow-sm font-medium"
            value={filterIssue}
            onChange={(e) => setFilterIssue(e.target.value)}
          >
            {uniqueIssues.map(issue => (
              <option key={issue} value={issue}>
                {issue === "All" ? "All Issues" : issue}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-destructive"></div>
        </div>
      ) : atRiskExperts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border rounded-2xl shadow-sm p-12">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Knowledge at Risk!</h3>
          <p className="text-muted-foreground max-w-sm text-center mb-6">
            All experts have sufficient knowledge capture coverage. Great job!
          </p>
        </div>
      ) : filteredExperts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-card border border-border rounded-2xl shadow-sm p-12">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
            <Search className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No matching experts found</h3>
          <p className="text-muted-foreground max-w-sm text-center mb-6">
            Try adjusting your search query or filter to see more results.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredExperts.map((expert, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={expert.id}
              className="bg-card border-2 border-destructive/20 rounded-2xl p-6 flex flex-col hover:border-destructive/50 transition-colors shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-lg">{expert.name}</h4>
                  <p className="text-sm text-muted-foreground">{expert.department}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-destructive bg-destructive/10 px-2 py-1 rounded-md">
                  High Risk
                </span>
              </div>
              
              <div className="mt-2 text-sm bg-destructive/5 p-3 rounded-lg border border-destructive/10">
                <span className="text-destructive font-medium block mb-1">Issue:</span> 
                <span className="text-muted-foreground">{expert.risk_reason}</span>
              </div>
              
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Capture Coverage</span>
                <span className="text-xl font-bold text-destructive">{expert.coverage.toFixed(0)}%</span>
              </div>

              {expert.open_gaps > 0 && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Unresolved Gaps</span>
                  <span className="text-sm font-bold text-destructive">{expert.open_gaps}</span>
                </div>
              )}
              
              <button 
                onClick={() => startFollowUp(expert.id)}
                disabled={startingId === expert.id}
                className="w-full mt-4 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {startingId === expert.id && <Loader2 className="w-4 h-4 animate-spin" />}
                {expert.has_active_session ? 'Resume Interview' : 'Start Follow-up Interview'}
              </button>

              <button 
                onClick={() => navigate(`/experts/${expert.id}`)}
                className="w-full mt-2 bg-secondary text-secondary-foreground py-2.5 rounded-xl font-semibold hover:bg-secondary/80 transition-colors"
              >
                View Profile
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
