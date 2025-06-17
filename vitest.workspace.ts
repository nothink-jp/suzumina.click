/// <reference types="vitest" />
import { defineWorkspace } from "vitest/config";

// Basic workspace configuration for functions tests only
// Storybook test integration disabled for now to avoid import issues
export default defineWorkspace([
  "apps/functions/vitest.config.ts",
  "apps/web/vitest.config.ts",
  "packages/shared-types/vitest.config.ts",
]);
