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
				"**/__mocks__/**", // Vitest 手動 mock（テスト基盤・SPR-170）
				"src/test-utils/**", // テスト共通ヘルパ（SPR-170）
				"**/e2e/**",
				"src/**/layout.tsx", // App Router boilerplate
				// 認証フレームワークの glue（インスタンス生成 / クライアント / ルートハンドラ）はロジックを持たない（SPR-156）
				// auth.ts から分離した betterAuth コールバック実体（guild 同期 / 初回作成 / session enrich）も
				// Firestore 副作用が主で従来 auth.ts に同居・除外済みだったため、計上は中立に保つ（SPR-168）。
				"src/lib/better-auth/auth.ts",
				"src/lib/better-auth/guild-sync.ts",
				"src/lib/better-auth/enrich-session.ts",
				"src/lib/better-auth/on-first-signup.ts",
				"src/app/api/auth/**",
				// 認証プロバイダ切替の glue（動的 import / better-auth client / hooks 分岐で単体テスト困難）(SPR-157)
				"src/lib/auth/server.ts",
				"src/lib/auth/client.ts",
				"src/lib/auth/better-auth-client.ts",
			],
			// 実測フロアに合わせたラチェット閾値（回帰ガード / SPR-152, SPR-155）
			// SPR-161: works/actions.ts の全件スキャン系デッドコード（テスト込み）撤去でフロアが微低下し再ピン
			thresholds: {
				statements: 81,
				branches: 74,
				functions: 82,
				lines: 81,
			},
		},
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
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
		"process.env.BETTER_AUTH_SECRET": '"test"',
		"process.env.BETTER_AUTH_URL": '"http://localhost:3000"',
	},
});
