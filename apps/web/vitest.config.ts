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
		server: {
			deps: {
				external: ["next/server"],
			},
		},
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
			"**/e2e/**", // E2Eテストを除外
			"src/actions/__tests__/video-actions.test.ts", // Server Actions V2テスト（server configで実行）
			"src/actions/__tests__/audio-button-actions.test.ts", // Server Actions V2テスト（server configで実行）
		],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	define: {
		// Fix for NextAuth module resolution issues
		"process.env.NEXTAUTH_SECRET": '"test"',
		"process.env.NEXTAUTH_URL": '"http://localhost:3000"',
	},
});
