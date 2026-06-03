"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/layout/sidebar";
import { DashboardTopbar } from "@/components/layout/topbar";

interface DashboardLayoutClientProps {
  user: {
    id: string;
    role: string;
    name?: string | null;
    email?: string | null;
    companyId: string;
  };
  children: React.ReactNode;
}

export function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 sm:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar - hidden on mobile unless open */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out sm:relative sm:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <DashboardSidebar user={user} onCloseMobile={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        <DashboardTopbar 
          user={user} 
          onMenuClick={() => setMobileMenuOpen(true)} 
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
