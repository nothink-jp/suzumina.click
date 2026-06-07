import path from "node:path";
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["src/actions/__tests__/**/*.test.ts"],
		exclude: ["**/node_modules/**", "**/dist/**"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	define: {
		"process.env.BETTER_AUTH_SECRET": '"test"',
		"process.env.BETTER_AUTH_URL": '"http://localhost:3000"',
	},
});
