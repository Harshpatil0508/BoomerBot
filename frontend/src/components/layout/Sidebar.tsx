import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Mic, Database, MessageSquare, Zap, BookOpen, Users, AlertTriangle, LogOut, Share2, Sun, Moon, PanelLeftClose, PanelLeftOpen, FileSearch } from "lucide-react";
import { cn } from "../../lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

const STORAGE_KEY = "boomerbot_sidebar_collapsed";

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEY) === "true");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);
  
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ['ADMIN'] },
    { name: "Knowledge Assistant", href: "/assistant", icon: MessageSquare, roles: ['ADMIN', 'USER'] },
    { name: "Knowledge Assets", href: "/assets", icon: BookOpen, roles: ['ADMIN', 'USER'] },
    { name: "Knowledge Network", href: "/network", icon: Share2, roles: ['ADMIN'] },
    { name: "Knowledge Capture", href: "/setup", icon: Mic, roles: ['ADMIN'] },
    { name: "Data Scanner", href: "/scanner", icon: Database, roles: ['ADMIN'] },
    { name: "Experts Directory", href: "/experts", icon: Users, roles: ['ADMIN'] },
    { name: "Knowledge at Risk", href: "/at-risk", icon: AlertTriangle, roles: ['ADMIN'] },
    { name: "Candidate Screening", href: "/screening", icon: FileSearch, roles: ['ADMIN'] },
  ];

  const visibleNav = navigation.filter(item => user && item.roles.includes(user.role));

  const label = (text: string, className?: string) => (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          exit={{ opacity: 0, width: 0 }}
          transition={{ duration: 0.15 }}
          className={cn("whitespace-nowrap overflow-hidden", className)}
        >
          {text}
        </motion.span>
      )}
    </AnimatePresence>
  );

  return (
    <motion.div
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex flex-col bg-card border-r border-border relative overflow-hidden shrink-0"
    >
      {/* Decorative gradient blob */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 -translate-x-1/2" />
      
      {/* Header */}
      <div className={cn(
        "h-16 flex items-center border-b border-border relative z-10 shrink-0",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {label("BoomerBot", "font-bold text-lg tracking-tight")}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-3 w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors relative z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* Navigation */}
      <div className="flex-1 py-6 flex flex-col relative z-10 min-h-0">
        {!collapsed && (
          <div className="px-3 py-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold">Navigation</span>
          </div>
        )}
        <nav className="space-y-1.5 px-3 flex-1 overflow-y-auto overflow-x-hidden">
          {visibleNav.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                  collapsed ? "justify-center px-0" : "px-3",
                  isActive 
                    ? "text-primary bg-primary/10 shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active"
                    className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {label(item.name)}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className={cn("border-t border-border mt-auto", collapsed ? "p-2" : "p-4")}>
          <div className={cn("flex items-center gap-3 mb-4", collapsed ? "flex-col gap-2" : "px-2")}>
            <div
              className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0"
              title={collapsed ? `${user?.email} (${user?.role})` : undefined}
            >
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{user?.role}</p>
              </div>
            )}
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          
          <button 
            onClick={logout}
            title={collapsed ? "Sign Out" : undefined}
            className={cn(
              "w-full flex items-center gap-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
              collapsed ? "justify-center px-0" : "px-3"
            )}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {label("Sign Out")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
