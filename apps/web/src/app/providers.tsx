"use client";

import { HeroUIProvider } from "@heroui/react";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <HeroUIProvider>
      <SessionProvider session={session}>{children}</SessionProvider>
    </HeroUIProvider>
  );
}
