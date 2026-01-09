import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Home,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Library,
  PenTool,
  Upload,
  Wand2,
  LogOut,
  Database,
  Unplug
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'Vocabulary', path: '/vocabulary' },
  { icon: Wand2, label: 'OpenAI Studio', path: '/openai-studio' },
  { icon: Wand2, label: 'Gemini Studio', path: '/gemini-studio' },
  { icon: Upload, label: 'Bulk Upload', path: '/bulk-upload' },
  { icon: Library, label: 'Resources', path: '/resources' },
  { icon: FileText, label: 'Blogs', path: '/blogs' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('vocabulary').select('id', { count: 'exact', head: true }).limit(1);
        setIsConnected(!error);
      } catch (err) {
        setIsConnected(false);
      }
    };

    checkConnection();
    // Re-check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className={cn(
        'h-screen bg-card border-r transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="p-4 flex items-center justify-between border-b min-h-[73px]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
            <img
              src="/langobridge-app-icon.jpg"
              alt="LangoBridge"
              className="w-full h-full object-cover"
            />
          </div>
          {!isCollapsed && (
            <span className="text-xl font-bold text-primary tracking-tight whitespace-nowrap">LangoBridge</span>
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 hover:bg-accent rounded-lg transition-colors shrink-0"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon
                size={22}
                className={cn(
                  'shrink-0 transition-transform duration-200 group-hover:scale-110',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                )}
              />
              {!isCollapsed && (
                <span className="font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t mt-auto space-y-4">
        {/* Connection Status Widget */}
        <div
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
            isConnected === true ? "bg-emerald-500/10 text-emerald-600" :
              isConnected === false ? "bg-rose-500/10 text-rose-600" : "bg-slate-100 text-slate-400",
            isCollapsed && "justify-center"
          )}
        >
          {isConnected === true ? <Database size={18} /> :
            isConnected === false ? <Unplug size={18} /> :
              <div className="w-[18px] h-[18px] border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />}

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black uppercase tracking-widest text-inherit/50 leading-tight">Database</span>
              <span className="text-sm font-bold truncate">
                {isConnected === true ? "Connected" :
                  isConnected === false ? "Offline" : "Checking..."}
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-3 p-3 rounded-xl bg-accent/50',
            isCollapsed && 'justify-center'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
            {user?.email?.[0].toUpperCase() || 'A'}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold truncate">Admin</span>
              <span className="text-xs text-muted-foreground truncate">
                {user?.email}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => signOut()}
          className={cn(
            'w-full flex items-center gap-3 p-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 group',
            isCollapsed && 'justify-center'
          )}
        >
          <LogOut size={22} className="shrink-0 transition-transform group-hover:translate-x-1" />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
