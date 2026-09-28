import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UploadCloud, FileText, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Setup() {
  const [file, setFile] = useState<File | null>(null);
  const [expertEmail, setExpertEmail] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type === 'application/pdf') {
        setFile(selected);
        setError(null);
      } else {
        setError('Please upload a PDF file.');
        setFile(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (dropped.type === 'application/pdf') {
        setFile(dropped);
        setError(null);
      } else {
        setError('Please upload a PDF file.');
      }
    }
  };

  const handleStart = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    if (expertEmail.trim()) {
      formData.append('expert_email', expertEmail.trim());
    }
    
    try {
      const res = await fetch('http://localhost:8000/api/sessions/upload-resume', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || 'Failed to initialize session');
      }
      
      const data = await res.json();
      setSuccessData(data);
      // navigate(`/capture/${data.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsUploading(false);
    }
  };

  if (successData) {
    const inviteLink = `${window.location.origin}/login`;
    const emailText = `Hello!\n\nYour interview session has been scheduled.\n\nPlease log in here: ${inviteLink}\nEmail: ${successData.credentials.email}\nPassword: ${successData.credentials.password}\n\nThank you!`;
    
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6 max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Interview Created Successfully!</h2>
        <p className="text-muted-foreground text-lg mb-8">
          The expert's profile has been created and their knowledge document has been parsed. 
          Please share the following credentials with them to begin the session.
        </p>

        <div className="w-full bg-card border border-border rounded-2xl p-6 mb-8 text-left space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Login Link</span>
            <p className="font-mono text-primary mt-1">{inviteLink}</p>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</span>
            <p className="font-mono font-bold mt-1">{successData.credentials.email}</p>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</span>
            <p className="font-mono font-bold mt-1">{successData.credentials.password}</p>
          </div>
        </div>

        <button 
          onClick={() => {
            navigator.clipboard.writeText(emailText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 flex items-center gap-3 w-full justify-center"
        >
          {copied ? "Copied to Clipboard!" : "Copy Invitation to Clipboard"}
        </button>

        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-6 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col justify-center max-w-[1200px] mx-auto p-6 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-card border border-border rounded-2xl p-8 shadow-xl text-center relative overflow-hidden mx-auto"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 relative z-10">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight mb-2 relative z-10">Initialize Session</h1>
        <p className="text-sm text-muted-foreground mb-8 relative z-10">
          Upload a document containing the expert's name, expertise, department, and detailed project experience to automatically configure the AI interviewer's context.
        </p>

        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all relative z-10 ${
            file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/50'
          }`}
        >
          <input 
            type="file" 
            accept=".pdf"
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold">{file.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Ready to process</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <UploadCloud className="w-8 h-8 opacity-50" />
              <p className="text-sm font-medium">Click to browse or drag PDF here</p>
            </div>
          )}
        </div>

        <div className="mt-4 relative z-10 text-left">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Expert Email <span className="text-destructive">(Required)</span></label>
          <input 
            type="email" 
            placeholder="expert@company.com"
            value={expertEmail}
            onChange={(e) => setExpertEmail(e.target.value)}
            className="w-full mt-1.5 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-destructive mt-4 font-medium relative z-10">
            {error}
          </motion.p>
        )}

        <div className="mt-8 relative z-10">
          <button
            onClick={handleStart}
            disabled={!file || !expertEmail.trim() || isUploading}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Parsing Context...
              </>
            ) : (
              "Start Knowledge Capture"
            )}
          </button>
          
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-4">
            Powered by BoomerBot AI
          </p>
        </div>
      </motion.div>
    </div>
  );
}
