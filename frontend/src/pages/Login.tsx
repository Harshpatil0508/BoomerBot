import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, KeyRound, Loader2, Mail, ArrowRight, ShieldCheck, Lock, Globe, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MagneticButton from '../components/MagneticButton';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [bootStep, setBootStep] = useState(0);
  const [isBooting, setIsBooting] = useState(true);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const timer1 = setTimeout(() => setBootStep(1), 500);
    const timer2 = setTimeout(() => setBootStep(2), 1000);
    const timer3 = setTimeout(() => setBootStep(3), 1500);
    const timer4 = setTimeout(() => setIsBooting(false), 2000);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch('http://localhost:8000/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Invalid email or password');
      }

      const data = await res.json();
      
      // Fetch user info
      const meRes = await fetch('http://localhost:8000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });
      const userData = await meRes.json();
      
      login(data.access_token, userData);
      
      if (userData.role === 'ADMIN') navigate('/dashboard');
      else if (userData.role === 'USER') navigate('/assistant');
      else if (userData.role === 'EXPERT' && userData.active_session_id) {
        navigate(`/capture/${userData.active_session_id}`);
      } else {
        navigate('/no-session'); 
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      
      {/* Left Side - Visuals (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden border-r border-border shadow-2xl z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background/90 to-background z-10" />
        <video 
          autoPlay 
          loop 
          muted 
          playsInline
          src="/tech_bg.mp4" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity scale-105"
        />

        {/* Floating Security Badges */}
        <motion.div 
          animate={{ y: [0, -15, 0] }} 
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-10 lg:left-20 bg-background/40 backdrop-blur-md border border-border/50 p-4 rounded-2xl shadow-xl flex items-center gap-3 z-30"
        >
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Certified</p>
            <p className="text-sm font-semibold">SOC2 Type II</p>
          </div>
        </motion.div>

        <motion.div 
          animate={{ y: [0, 15, 0] }} 
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[20%] right-10 lg:right-20 bg-background/40 backdrop-blur-md border border-border/50 p-4 rounded-2xl shadow-xl flex items-center gap-3 z-30"
        >
          <Lock className="w-6 h-6 text-primary" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Security</p>
            <p className="text-sm font-semibold">End-to-End Encrypted</p>
          </div>
        </motion.div>
        
        <div className="relative z-20 flex flex-col items-center text-center p-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 border border-primary/20 glow-primary backdrop-blur-md shadow-2xl"
          >
            <BrainCircuit className="w-12 h-12 text-primary" />
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl font-extrabold tracking-tight mb-6"
          >
            Welcome to <br/><span className="text-primary animate-text-shimmer">BoomerBot.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-lg text-muted-foreground max-w-md leading-relaxed"
          >
            The secure gateway to your enterprise's preserved knowledge network.
          </motion.p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-[0.8] flex items-center justify-center p-8 relative bg-background/50">
        {/* Decorative blobs for mobile */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 lg:hidden" />
        
        <AnimatePresence mode="wait">
          {isBooting ? (
            <motion.div 
              key="terminal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md bg-black/95 rounded-xl p-6 font-mono text-sm shadow-2xl border border-primary/20 text-green-500 h-64 flex flex-col justify-end relative z-10"
            >
              <div className="space-y-2">
                <p>{'>'} Establishing secure connection... {bootStep >= 1 && <span className="text-white">[OK]</span>}</p>
                {bootStep >= 1 && <p>{'>'} Verifying SOC2 protocols... {bootStep >= 2 && <span className="text-white">[OK]</span>}</p>}
                {bootStep >= 2 && <p>{'>'} Initializing authentication module... {bootStep >= 3 && <span className="text-white">[READY]</span>}</p>}
                {bootStep >= 3 && <p className="animate-pulse">{'>'} Launching interface_</p>}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full max-w-md relative z-10"
            >
              <div className="lg:hidden flex justify-center mb-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center glow-primary border border-primary/20">
                  <BrainCircuit className="w-8 h-8 text-primary" />
                </div>
              </div>
              
              <h2 className="text-3xl font-bold tracking-tight mb-3 text-center lg:text-left">Sign In</h2>
              <p className="text-muted-foreground mb-10 text-sm text-center lg:text-left">
                Authenticate to access the knowledge platform.
              </p>

              {/* SSO Buttons */}
              <div className="space-y-3 mb-6">
                <button 
                  type="button" 
                  onClick={() => alert("SSO integration coming soon!")}
                  className="w-full bg-card hover:bg-muted border border-border rounded-xl py-2.5 flex items-center justify-center gap-3 text-sm font-semibold transition-colors"
                >
                  <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                    <div className="bg-[#F25022] rounded-[2px]"></div>
                    <div className="bg-[#7FBA00] rounded-[2px]"></div>
                    <div className="bg-[#00A4EF] rounded-[2px]"></div>
                    <div className="bg-[#FFB900] rounded-[2px]"></div>
                  </div>
                  Continue with Microsoft
                </button>
                
                <button 
                  type="button" 
                  onClick={() => alert("SSO integration coming soon!")}
                  className="w-full bg-card hover:bg-muted border border-border rounded-xl py-2.5 flex items-center justify-center gap-3 text-sm font-semibold transition-colors"
                >
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  Continue with Google
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">or email</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-xl mb-6 text-center font-medium shadow-sm"
                >
                  {error}
                </motion.div>
              )}

            <form onSubmit={handleLogin} className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm group-hover:border-primary/30"
                    placeholder="admin@boomerbot.com"
                    required
                  />
                </div>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Password
                </label>
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl py-3.5 pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm group-hover:border-primary/30"
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <MagneticButton className="mt-8">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-base hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/25 glow-primary group"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>Enter Platform <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>
                </MagneticButton>
              </motion.div>
            </form>
            
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="mt-12 pt-8 border-t border-border/50 text-center"
            >
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-4">
                Demo Credentials
              </p>
              <div 
                onClick={() => { setEmail('admin@boomerbot.com'); setPassword('password123'); }}
                className="cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all text-xs text-muted-foreground bg-muted/30 py-3 rounded-lg border border-border/50 inline-flex flex-col items-center px-6 group"
                title="Click to auto-fill credentials"
              >
                <span className="font-mono text-foreground font-medium group-hover:text-primary transition-colors">admin@boomerbot.com</span>
                <span className="font-mono text-foreground font-medium opacity-70 mt-1 group-hover:text-primary/70 transition-colors">password123</span>
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
