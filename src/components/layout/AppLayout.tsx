
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="flex h-svh overflow-hidden supports-[height:100svh]:h-svh supports-[height:100dvh]:h-dvh"
           style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header 
            onMenuClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            sidebarCollapsed={sidebarCollapsed}
          />
          
          <main className={cn(
            "flex-1 overflow-y-auto transition-all duration-300 ease-in-out",
            "p-4 lg:p-6",
            "pb-20" // Add bottom padding to prevent content overlap
          )}>
            <div className="max-w-7xl mx-auto space-y-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
