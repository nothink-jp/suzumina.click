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
		// 標準エラー出力を抑制
		silent: true,
		server: {
			deps: {
				external: ["next/server"],
			},
		},
		coverage: {
			// `vitest run`（= pnpm test / verify / CI）で常に閾値を強制する（SPR-151）
			enabled: true,
			provider: "v8",
			reporter: ["text", "json", "lcov"],
			exclude: [
				"node_modules/**",
				"**/dist/**",
				"**/.next/**",
				"**/*.d.ts",
				"**/*.config.{js,ts,mjs,cjs,mts,cts}",
				"**/*.stories.{ts,tsx}",
				"**/__tests__/**",
				"**/e2e/**",
				"src/**/layout.tsx", // App Router boilerplate
				// 認証フレームワークの glue（インスタンス生成 / クライアント / ルートハンドラ）はロジックを持たない（SPR-156）
				"src/auth.ts", // NextAuth インスタンス（better-auth/auth.ts と同じ glue。Phase 2 で動的 import 経由で計上され始めた）
				"src/lib/better-auth/auth.ts",
				"src/app/api/auth/**",
				"src/app/api/ba-auth/**",
				// 認証プロバイダ切替の glue（動的 import / better-auth client / hooks 分岐で単体テスト困難）(SPR-157)
				"src/lib/auth/server.ts",
				"src/lib/auth/client.ts",
				"src/lib/auth/better-auth-client.ts",
			],
			// 実測フロアに合わせたラチェット閾値（回帰ガード / SPR-152, SPR-155）
			thresholds: {
				statements: 81,
				branches: 74,
				functions: 83,
				lines: 82,
			},
		},
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/cypress/**",
			"**/.{idea,git,cache,output,temp}/**",
			"**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
			"**/e2e/**", // E2Eテストを除外
			"src/actions/__tests__/video-actions.test.ts", // Server Actionsテスト（server configで実行）
			"src/actions/__tests__/audio-button-actions.test.ts", // Server Actionsテスト（server configで実行）
		],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@suzumina.click/shared-types": path.resolve(
				__dirname,
				"../../packages/shared-types/src/index.ts",
			),
		},
	},
	define: {
		// Fix for NextAuth module resolution issues
		"process.env.NEXTAUTH_SECRET": '"test"',
		"process.env.NEXTAUTH_URL": '"http://localhost:3000"',
	},
});
