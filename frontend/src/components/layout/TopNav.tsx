import { useLocation } from "react-router-dom";
import { Bell, Search, Wifi } from "lucide-react";

export default function TopNav() {
  const location = useLocation();
  
  const getTitle = () => {
    if (location.pathname.includes("dashboard")) return "Dashboard";
    if (location.pathname.includes("setup")) return "Session Setup";
    if (location.pathname.includes("capture")) return "Knowledge Capture";
    if (location.pathname.includes("assets")) return "Knowledge Assets";
    if (location.pathname.includes("assistant")) return "Knowledge Assistant";
    return "";
  };

  const getSubtitle = () => {
    if (location.pathname.includes("dashboard")) return "Overview & Analytics";
    if (location.pathname.includes("setup")) return "Initialize AI Context";
    if (location.pathname.includes("capture")) return "AI-Powered Expert Interview";
    if (location.pathname.includes("assets")) return "Generated SOPs, FAQs & Guides";
    if (location.pathname.includes("assistant")) return "RAG-Powered Knowledge Retrieval";
    return "";
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-xl shrink-0">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-base font-semibold leading-none">{getTitle()}</h1>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5 uppercase tracking-wider">{getSubtitle()}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Search knowledge..."
            className="h-9 w-56 rounded-lg border border-border bg-card pl-8 pr-3 text-xs ring-offset-background placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400">
          <Wifi className="w-3 h-3" />
          <span className="text-[10px] font-semibold">LIVE</span>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        </button>
      </div>
    </header>
  );
}
