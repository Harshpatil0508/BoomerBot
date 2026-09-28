import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, XCircle, ChevronRight, Activity, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Screening() {
  const [file, setFile] = useState<File | null>(null);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [domain, setDomain] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{score: number, strengths: string[], gaps: string[]} | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    fetch('http://localhost:8000/api/available-domains', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setAvailableDomains(data);
        if (data.length > 0) {
          setDomain(data[0]);
        }
      })
      .catch(console.error);
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('domain', domain);

      const res = await fetch('http://localhost:8000/api/screen-resume', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!res.ok) throw new Error('Analysis failed');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Error analyzing resume");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Candidate Screening</h2>
          <p className="text-muted-foreground mt-2">
            Evaluate candidate resumes against our captured enterprise knowledge base.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Upload Resume
            </h3>
            
            <div 
              className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('resume-upload')?.click()}
            >
              <input 
                id="resume-upload" 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm font-medium mb-1">
                {file ? file.name : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground">
                PDF format only
              </p>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Target Domain (Enterprise Standard)</label>
              <select 
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                {availableDomains.length === 0 ? (
                  <option value="" disabled>No domains with published assets found</option>
                ) : (
                  availableDomains.map((d) => (
                    <option key={d} value={d}>
                      {d} (Enterprise Standard)
                    </option>
                  ))
                )}
              </select>
            </div>

            <button 
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Analyzing Knowledge Alignment...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze Alignment
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px]">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Alignment Analysis
          </h3>

          {!result && !isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground pt-12">
              <Sparkles className="w-12 h-12 mb-4 opacity-20" />
              <p>Upload a resume to see how the candidate aligns</p>
              <p className="text-sm">with our enterprise standards.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center pt-12 space-y-4">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm font-medium animate-pulse text-primary">Cross-referencing RAG Vector Database...</p>
            </div>
          )}

          {result && !isAnalyzing && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Score Display */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                    <motion.circle 
                      initial={{ strokeDasharray: "0 400" }}
                      animate={{ strokeDasharray: `${(result.score / 100) * 351} 400` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      cx="64" cy="64" r="56" fill="transparent" stroke="currentColor" strokeWidth="8" 
                      className={result.score >= 70 ? 'text-green-500' : result.score >= 40 ? 'text-yellow-500' : 'text-red-500'}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold">{result.score}%</span>
                  </div>
                </div>
                <p className="text-sm font-medium mt-3 text-muted-foreground">Knowledge Alignment Score</p>
              </div>

              {/* Strengths */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-green-500">
                  <CheckCircle className="w-4 h-4" />
                  Aligned Enterprise Knowledge
                </h4>
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
                  {result.strengths.map((str, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{str}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gaps */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2 text-red-500">
                  <XCircle className="w-4 h-4" />
                  Missing Tacit Knowledge
                </h4>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-2">
                  {result.gaps.map((gap, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>{gap}</span>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
