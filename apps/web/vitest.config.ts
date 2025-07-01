import path from "node:path";
import react from "@vitejs/plugin-react";
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: ["./vitest.setup.ts"],
		typecheck: {
			tsconfig: "tsconfig.test.json",
		},
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
			"**/e2e/**", // E2Eテストを除外
		],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			// Direct module mapping to fix NextAuth issues
			"next-auth": path.resolve(__dirname, "./vitest-mocks/next-auth.js"),
			"next-auth/react": path.resolve(__dirname, "./vitest-mocks/next-auth-react.js"),
			"next-auth/providers/discord": path.resolve(
				__dirname,
				"./vitest-mocks/next-auth-providers-discord.js",
			),
			"next/server": path.resolve(__dirname, "./vitest-mocks/next-server.js"),
		},
	},
	define: {
		// Fix for NextAuth module resolution issues
		"process.env.NEXTAUTH_SECRET": '"test"',
		"process.env.NEXTAUTH_URL": '"http://localhost:3000"',
	},
});
