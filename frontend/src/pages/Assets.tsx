import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, BookOpen, AlertTriangle, ChevronRight, X, 
  Download, Clock, User, Layers, Sparkles, Search, CheckCircle2, Ban, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { markdownToHtml } from '../lib/markdown';

interface Asset {
  id: string;
  title: string;
  type: string;
  status: string;
  domain: string;
  expert_name: string;
  created_at: string | null;
}

interface AssetDetail {
  id: string;
  title: string;
  type: string;
  status: string;
  content: string;
  domain: string;
  expert_name: string;
  created_at: string | null;
}

const typeConfig: Record<string, { icon: typeof FileText; color: string; bgColor: string }> = {
  'SOP': { icon: BookOpen, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  'FAQ': { icon: FileText, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  'Troubleshooting Guide': { icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function Assets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { token, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParams] = useSearchParams();
  const [isPublishing, setIsPublishing] = useState<string | null>(null);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  const handlePublish = async (assetId: string) => {
    setIsPublishing(assetId);
    try {
      const res = await fetch(`http://localhost:8000/api/assets/${assetId}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAssets(assets.map(a => a.id === assetId ? { ...a, status: 'PUBLISHED' } : a));
        if (selectedAsset && selectedAsset.id === assetId) {
          setSelectedAsset({ ...selectedAsset, status: 'PUBLISHED' });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPublishing(null);
    }
  };

  const handleReject = async (assetId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/assets/${assetId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAssets(assets.map(a => a.id === assetId ? { ...a, status: 'REJECTED' } : a));
        if (selectedAsset && selectedAsset.id === assetId) {
          setSelectedAsset({ ...selectedAsset, status: 'REJECTED' });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/api/assets', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setAssets(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openAsset = async (assetId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/assets/${assetId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch asset');
      const data = await res.json();
      setSelectedAsset(data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredAssets = assets.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.expert_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedAssets = filteredAssets.reduce((acc, asset) => {
    if (!acc[asset.expert_name]) acc[asset.expert_name] = [];
    acc[asset.expert_name].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

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
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Generated Knowledge Assets
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {assets.length} asset{assets.length !== 1 ? 's' : ''} generated from expert interviews
          </p>
        </div>
      </motion.div>

      {/* Search Bar */}
      {assets.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets by title, type, or domain..."
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          />
        </motion.div>
      )}

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center flex-1 py-20"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <FileText className="w-10 h-10 text-primary/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No knowledge assets yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Complete an expert interview session and click "Generate Assets" to create SOPs, FAQs, and Troubleshooting Guides automatically.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedAssets).map(([expertName, expertAssets]) => (
            <div key={expertName} className="space-y-4">
              <h3 className="text-xl font-bold flex items-center gap-2 border-b border-border pb-2 text-foreground/80">
                <User className="w-5 h-5 text-primary" />
                {expertName}'s Knowledge
              </h3>
              <motion.div 
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {expertAssets.map((asset) => {
                  const config = typeConfig[asset.type] || typeConfig['SOP'];
                  const Icon = config.icon;
                  return (
                    <motion.div 
                      key={asset.id} 
                      variants={itemVariants}
                      onClick={() => openAsset(asset.id)}
                      className="group relative rounded-xl border border-border bg-card hover:bg-card/80 hover:border-primary/30 transition-all p-6 shadow-sm hover:shadow-md cursor-pointer"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <div className={`w-11 h-11 rounded-xl ${config.bgColor} ${config.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-[10px] font-bold uppercase tracking-widest ${config.color} mb-1 flex items-center gap-2`}>
                            {asset.type}
                            <span className={`px-1.5 py-0.5 rounded text-[8px] ${
                              asset.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-500' : 
                              asset.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' : 
                              'bg-amber-500/20 text-amber-500'
                            }`}>
                              {asset.status || 'DRAFT'}
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{asset.title}</h3>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Layers className="w-3 h-3" />
                          <span className="truncate">{asset.domain}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(asset.created_at)}</span>
                        </div>
                      </div>

                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 translate-x-[-4px]">
                        <ChevronRight className="w-5 h-5 text-primary" />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          ))}
        </div>
      )}

      {/* Asset Detail Drawer */}
      <AnimatePresence>
        {selectedAsset && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAsset(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-3xl bg-background border-l border-border z-50 shadow-2xl flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-border bg-card/50 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {(() => {
                    const config = typeConfig[selectedAsset.type] || typeConfig['SOP'];
                    const Icon = config.icon;
                    return (
                      <div className={`w-10 h-10 rounded-xl ${config.bgColor} ${config.color} flex items-center justify-center shrink-0`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    );
                  })()}
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">
                      {selectedAsset.type}
                    </div>
                    <h2 className="font-bold text-lg truncate">{selectedAsset.title}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => {
                      const blob = new Blob([selectedAsset.content], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${selectedAsset.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
                      a.click();
                    }}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                    title="Download as Markdown"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setSelectedAsset(null)}
                    className="p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Metadata Bar */}
              <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border text-xs text-muted-foreground bg-card/30 shrink-0">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 min-w-0">
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <User className="w-3 h-3 shrink-0" />
                    {selectedAsset.expert_name}
                  </span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Layers className="w-3 h-3 shrink-0" />
                    {selectedAsset.domain}
                  </span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Clock className="w-3 h-3 shrink-0" />
                    {formatDate(selectedAsset.created_at)}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                    selectedAsset.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-500' : 
                    selectedAsset.status === 'REJECTED' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                  }`}>
                    {selectedAsset.status || 'DRAFT'}
                  </span>
                </div>
                
                {user?.role === 'ADMIN' && (selectedAsset.status === 'DRAFT' || !selectedAsset.status) && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => handleReject(selectedAsset.id)}
                      className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-semibold whitespace-nowrap transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5 shrink-0" />
                      Reject
                    </button>
                    <button 
                      onClick={() => handlePublish(selectedAsset.id)}
                      disabled={isPublishing === selectedAsset.id}
                      className="h-9 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-500/20 text-xs font-semibold whitespace-nowrap transition-colors disabled:opacity-50"
                    >
                      {isPublishing === selectedAsset.id ? (
                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      )}
                      Approve &amp; Publish
                    </button>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                    />
                  </div>
                ) : (
                  <div 
                    className="max-w-none text-foreground/90"
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(selectedAsset.content) }}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
