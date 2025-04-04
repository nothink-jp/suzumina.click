"use client";

import { Navigation } from "@/components/Navigation";

interface AppShellProps {
  userId?: string | null;
  children: React.ReactNode;
}

export function AppShell({ userId, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userId={userId} />
      <main>{children}</main>
    </div>
  );
}