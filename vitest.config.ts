/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom', // jsdomからhappy-domに変更
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // テストのタイムアウト時間を10秒に延長（デフォルトは5秒）
    testTimeout: 10000,
    // functionsディレクトリのテストを除外
    exclude: ['functions/**'],
    // カバレッジレポート設定
    coverage: {
      provider: 'v8', // v8プロバイダーを使用 (@vitest/coverage-v8 パッケージが既にインストールされているため)
      reporter: ['text', 'json', 'html'], // テキスト、JSON、HTML形式でレポートを出力
      reportsDirectory: './coverage', // レポートの出力先ディレクトリ
      exclude: [
        'node_modules/**',
        '.next/**', // Next.jsのビルド出力を除外（turbopackのエラー回避）
        '.firebase/**', // Firebaseビルド出力を除外（不要なデプロイメントファイル）
        'vitest.*.{js,ts}',
        '**/*.d.ts',
        '**/*.config.{js,ts,mjs,cjs,mts,cts}',
        '**/dist/**',
        '**/.storybook/**',
        'functions/**', // functionsディレクトリを除外
      ],
      thresholds: {
        // .clinerules で指定された80%の閾値を設定
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})