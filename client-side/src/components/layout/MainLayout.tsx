import { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden w-full relative">
      <div className="shrink-0 h-full">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>
      <main className="flex-1 overflow-y-auto h-full scroll-smooth">
        <div className="p-6 max-w-[1600px] mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
