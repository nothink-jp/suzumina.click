"use client";

import { HeroUIProvider } from "@heroui/react";
import type { ReactNode } from "react";

/**
 * Wraps HeroUIProvider in a Client Component boundary.
 */
export function ClientProviders({ children }: { children: ReactNode }) {
  return <HeroUIProvider>{children}</HeroUIProvider>;
}