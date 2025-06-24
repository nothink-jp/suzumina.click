/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

// Root Vitest configuration with workspace projects
export default defineConfig({
	test: {
		// Workspace projects configuration
		projects: [
			"apps/functions/vitest.config.ts",
			"apps/web/vitest.config.ts",
			"packages/shared-types/vitest.config.ts",
			"packages/ui/vitest.config.ts",
		],
	},
});
