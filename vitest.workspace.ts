/// <reference types="vitest" />
import { defineWorkspace } from "vitest/config";

// Workspace configuration for all test environments
export default defineWorkspace([
  "apps/functions/vitest.config.ts",
  "apps/web/vitest.config.ts",
  "packages/shared-types/vitest.config.ts",
  "packages/ui/vitest.config.ts",
]);
