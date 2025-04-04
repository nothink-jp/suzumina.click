"use client";

import { Navigation } from "@/components/Navigation";
import { useSession } from "next-auth/react";
import { Fragment } from "react";

export function GlobalLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  return (
    <div className="min-h-screen bg-gray-50">
      {status === "loading" ? (
        <Fragment />
      ) : (
        <Navigation />
      )}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}