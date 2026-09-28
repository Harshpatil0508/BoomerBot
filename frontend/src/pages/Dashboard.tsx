import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Users, Layers, Activity, ArrowRight, 
  TrendingUp, Brain, Shield, Clock, Sparkles, UserPlus, Copy, Check, Trash2, X, AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
  total_assets: number;
  total_sessions: number;
  total_insights: number;
  total_experts: number;
  domains: number;
  avg_coverage: number;
  recent_sessions: {
    id: string;
    expert_name: string;
    domain: string;
    coverage: number;
    status: string;
    created_at: string | null;
    message_count: number;
    insight_count: number;
  }[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteResult, setInviteResult] = useState<{email: string, password: string} | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState<any[]>([]);
  const [atRiskExperts, setAtRiskExperts] = useState<any[]>([]);

  const fetchInvitedUsers = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/users/invited', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setInvitedUsers(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const revokeAccess = async (userId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setInvitedUsers(prev => prev.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: inviteEmail })
      });
      if (res.ok) {
        const data = await res.json();
        setInviteResult(data);
        setInviteEmail("");
      } else {
        alert("Failed to invite user (email might already exist)");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInviteLoading(false);
    }
  };

  const copyCredentials = () => {
    if (inviteResult) {
      navigator.clipboard.writeText(`Email: ${inviteResult.email}\nPassword: ${inviteResult.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    fetch('http://localhost:8000/api/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setStats({
          total_assets: 0, total_sessions: 0, total_insights: 0, total_experts: 0,
          domains: 0, avg_coverage: 0, recent_sessions: []
        });
        setLoading(false);
      });

    fetch('http://localhost:8000/api/dashboard/at-risk', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setAtRiskExperts(data))
      .catch(console.error);
  }, [token]);

  const statCards = stats ? [
    { 
      title: "Knowledge Assets", 
      value: stats.total_assets, 
      icon: FileText,
      gradient: "from-orange-500/20 to-amber-500/10",
      iconColor: "text-orange-400",
      description: "SOPs, FAQs & Guides generated"
    },
    { 
      title: "Experts Profiled", 
      value: stats.total_experts, 
      icon: Users,
      gradient: "from-blue-500/20 to-cyan-500/10",
      iconColor: "text-blue-400",
      description: "Knowledge capture sessions"
    },
    { 
      title: "Knowledge Domains", 
      value: stats.domains, 
      icon: Layers,
      gradient: "from-violet-500/20 to-purple-500/10",
      iconColor: "text-violet-400",
      description: "Unique expertise areas"
    },
    { 
      title: "Insights Extracted", 
      value: stats.total_insights, 
      icon: Brain,
      gradient: "from-emerald-500/20 to-green-500/10",
      iconColor: "text-emerald-400",
      description: "Process, tacit & gap insights"
    },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-8">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Enterprise Knowledge Platform</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
            Preserve the knowledge that experience creates.
          </h2>
          <p className="text-muted-foreground text-lg mt-2 max-w-2xl">
            BoomerBot captures expert knowledge before it walks out the door. Start an interview session to begin preserving critical operational expertise.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <Link 
              to="/setup"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-primary/25"
            >
              Start Knowledge Capture
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              to="/assistant"
              className="inline-flex items-center gap-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Ask BoomerBot
            </Link>
          </div>
        </div>
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl translate-y-1/2" />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div 
            key={stat.title} 
            variants={itemVariants}
            className={`relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${stat.gradient} p-6 shadow-sm hover:shadow-md transition-shadow group`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <motion.p 
                  className="text-3xl font-bold mt-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 200 }}
                >
                  {stat.value}
                </motion.p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </div>
              <div className={`p-3 rounded-xl bg-background/50 ${stat.iconColor} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Sessions */}
        <motion.div variants={itemVariants} className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Recent Sessions
            </h3>
            <Link to="/setup" className="text-xs text-primary hover:underline font-medium">
              View all →
            </Link>
          </div>
          {stats && stats.recent_sessions.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_sessions.map((session) => (
                <Link 
                  to={`/capture/${session.id}`}
                  key={session.id} 
                  className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0 group-hover:scale-110 transition-transform">
                    {session.expert_name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">{session.expert_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        session.status === 'completed' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{session.domain}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-primary">{session.coverage}%</div>
                    <div className="text-[10px] text-muted-foreground">{session.insight_count} insights</div>
                  </div>
                  <div className="w-16 shrink-0">
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${session.coverage}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No interview sessions yet</p>
              <Link to="/setup" className="text-xs text-primary mt-2 hover:underline">Start your first session →</Link>
            </div>
          )}
        </motion.div>

        {/* Quick Actions & Info */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Platform Health */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-emerald-400" />
              Platform Health
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Avg. Coverage</span>
                <span className="text-sm font-bold">{stats?.avg_coverage || 0}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats?.avg_coverage || 0}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-center p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-lg font-bold text-primary">{stats?.total_sessions || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Sessions</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-lg font-bold text-emerald-400">{stats?.total_insights || 0}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Insights</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link 
                to="/setup" 
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">New Interview</div>
                  <div className="text-[10px] text-muted-foreground">Capture expert knowledge</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link 
                to="/assets" 
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 group-hover:bg-violet-500/20 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Browse Assets</div>
                  <div className="text-[10px] text-muted-foreground">View generated docs</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link 
                to="/assistant" 
                className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <Brain className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">Ask Assistant</div>
                  <div className="text-[10px] text-muted-foreground">Query preserved knowledge</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>

          {/* User Management */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
              <UserPlus className="w-4 h-4 text-blue-400" />
              Invite Employee
            </h3>
            
            {inviteResult ? (
              <div className="bg-background border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-emerald-400 mb-2">
                  <Check className="w-4 h-4" />
                  <span>Access Generated!</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{inviteResult.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Temporary Password</p>
                  <p className="text-sm font-medium">{inviteResult.password}</p>
                </div>
                <button 
                  onClick={copyCredentials}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded bg-secondary/50 hover:bg-secondary text-xs font-medium transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Credentials"}
                </button>
                <button 
                  onClick={() => setInviteResult(null)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-2"
                >
                  Invite another
                </button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-3">
                <p className="text-xs text-muted-foreground">Generate access for a standard employee to use the Knowledge Assistant.</p>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="employee@company.com" 
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
                <button 
                  type="submit" 
                  disabled={inviteLoading || !inviteEmail}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {inviteLoading ? (
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                    />
                  ) : (
                    "Generate Access"
                  )}
                </button>
              </form>
            )}
            
            <button 
              onClick={() => {
                fetchInvitedUsers();
                setShowManageModal(true);
              }}
              className="w-full mt-4 text-xs font-medium text-primary hover:underline flex items-center justify-center gap-1"
            >
              Manage Granted Access →
            </button>
          </div>
        </motion.div>
      </div>

      {/* Manage Access Modal */}
      <AnimatePresence>
        {showManageModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManageModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Granted Access
                </h3>
                <button onClick={() => setShowManageModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                {invitedUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No employees have been invited yet.</p>
                ) : (
                  <div className="space-y-3">
                    {invitedUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{u.email}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Created {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                        <button 
                          onClick={() => revokeAccess(u.id)}
                          className="ml-3 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                          title="Revoke Access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
