import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, AlertCircle, FileSpreadsheet, Loader2, ServerCrash, KeyRound, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function DataScanner() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const scanDataset = async () => {
    if (!file) return;
    setIsScanning(true);
    setError(null);
    setResults(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('http://localhost:8000/api/admin/scan-dataset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to scan dataset');
      }
      
      setResults(data.anomalies);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dataset Anomaly Scanner</h1>
        <p className="text-muted-foreground max-w-3xl">
          Upload the BoomerBot Synthetic Dataset to perform cross-sheet relational joins and detect critical knowledge gaps, RBAC violations, and false-positive interview states.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div 
            className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-background/50 hover:bg-muted/50 transition-colors"
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <FileSpreadsheet className="w-12 h-12 text-primary/50 mb-4" />
            <h3 className="font-semibold mb-1">Upload Dataset</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your .xlsx file here, or click to browse.
            </p>
            <input 
              type="file" 
              accept=".xlsx" 
              className="hidden" 
              id="file-upload" 
              onChange={handleFileChange}
            />
            <label 
              htmlFor="file-upload" 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium cursor-pointer hover:opacity-90"
            >
              Browse Files
            </label>
            {file && (
              <div className="mt-4 p-3 bg-secondary rounded-md w-full flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium truncate">{file.name}</span>
              </div>
            )}
          </div>

          <button
            onClick={scanDataset}
            disabled={!file || isScanning}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-primary/90"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning Dataset...
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" />
                Run Anomaly Scan
              </>
            )}
          </button>
          
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {isScanning ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-background/50 border border-border rounded-xl">
              <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary/40" />
              <p className="font-medium animate-pulse">Running cross-sheet joins...</p>
            </div>
          ) : results ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h2 className="text-xl font-bold">Scan Complete</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(results).map(([key, data]) => {
                  const hasAnomalies = data.count > 0;
                  return (
                    <motion.div 
                      key={key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-5 rounded-xl border relative overflow-hidden ${
                        hasAnomalies ? 'bg-destructive/5 border-destructive/30' : 'bg-secondary/30 border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <div>
                          <div className="text-xs font-bold text-muted-foreground mb-1">{key}</div>
                          <h3 className={`font-semibold ${hasAnomalies ? 'text-destructive' : 'text-foreground'}`}>
                            {data.title}
                          </h3>
                        </div>
                        <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          hasAnomalies ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {data.count} found
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground relative z-10">{data.description}</p>
                      
                      {hasAnomalies && (
                        <div className="absolute -bottom-6 -right-6 opacity-10 rotate-12">
                          <ShieldAlert className="w-32 h-32 text-destructive" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-background/50 border border-border border-dashed rounded-xl p-8 text-center">
              <ServerCrash className="w-12 h-12 mb-4 opacity-20" />
              <h3 className="font-medium mb-2">No Results Yet</h3>
              <p className="text-sm max-w-sm">
                Upload the synthetic dataset and click Run Scan to perform the anomaly detection pipeline.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
