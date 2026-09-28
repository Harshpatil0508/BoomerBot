import { useState, useEffect, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useAuth } from '../contexts/AuthContext';
import { Share2, Maximize2, Loader2, Info } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function KnowledgeNetwork() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fgRef = useRef<any>();
  
  // Custom colors based on group
  const getNodeColor = (node: any) => {
    switch (node.group) {
      case 1: return '#10b981'; // Emerald for Departments
      case 2: return '#f97316'; // Orange for Experts
      case 3: return '#3b82f6'; // Blue for Sessions/Domains
      case 4: return '#8b5cf6'; // Purple for Insights
      default: return '#64748b'; // Gray fallback
    }
  };

  const getNodeSize = (node: any) => {
    switch (node.group) {
      case 1: return 12; // Departments are largest
      case 2: return 8;  // Experts
      case 3: return 6;  // Sessions
      case 4: return 4;  // Insights
      default: return 5;
    }
  };

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/network-graph', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch network data');
        const data = await res.json();
        setGraphData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchGraphData();
  }, [token]);

  // Use useCallback so we don't recreate the render function constantly
  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    const nodeR = getNodeSize(node);
    
    // Draw Node
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();
    
    // Node styling
    ctx.lineWidth = 1;
    ctx.strokeStyle = theme === 'dark' ? '#0f172a' : '#ffffff';
    ctx.stroke();

    // Draw Label (only if zoomed in enough or if it's a major node)
    if (globalScale >= 1.5 || node.group <= 2) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme === 'dark' ? '#f8fafc' : '#0f172a';
      ctx.font = `${node.group === 1 ? 'bold ' : ''}${fontSize}px Inter, sans-serif`;
      
      // A small background pill for the text could go here, but simple text is cleaner
      ctx.fillText(label, node.x, node.y + nodeR + (6 / globalScale));
    }
  }, [theme]);

  return (
    <div className="h-full flex flex-col gap-4 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Share2 className="w-6 h-6 text-emerald-500" />
            Knowledge Network
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Interactive visualization of your organization's tacit knowledge ecosystem.
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-sm font-medium">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Departments</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /> Experts</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /> Domains</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500" /> Insights</div>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 bg-card border border-border rounded-2xl relative overflow-hidden shadow-sm flex flex-col">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
            <p className="text-muted-foreground font-medium animate-pulse">Mapping organizational brain...</p>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="bg-destructive/10 text-destructive px-6 py-4 rounded-xl border border-destructive/20 font-medium">
              {error}
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-md border border-border px-4 py-3 rounded-xl flex items-start gap-3 max-w-sm shadow-xl">
          <Info className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Drag nodes to interact with the physics engine. Scroll to zoom in and out. Click on a node to snap the camera to it.
          </p>
        </div>

        <button 
          onClick={() => fgRef.current?.zoomToFit(400, 50)}
          className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-md border border-border p-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shadow-sm"
          title="Reset Zoom"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <div className="flex-1 w-full h-full relative cursor-move">
          {!loading && !error && graphData.nodes.length > 0 ? (
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              backgroundColor={theme === 'dark' ? '#020617' : '#f8fafc'}
              nodeCanvasObject={paintNode}
              nodeLabel={(node: any) => {
                if (node.group === 2) return `Expert: ${node.fullName}`;
                if (node.group === 4) return `${node.type?.toUpperCase()} Insight: ${node.name}`;
                return node.name;
              }}
              linkColor={() => theme === 'dark' ? '#334155' : '#cbd5e1'}
              linkOpacity={0.6}
              linkWidth={1.5}
              onNodeClick={(node: any) => {
                fgRef.current?.centerAt(node.x, node.y, 1000);
                fgRef.current?.zoom(4, 1000);
              }}
              d3VelocityDecay={0.3}
            />
          ) : (
            !loading && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                No knowledge network data available yet.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
