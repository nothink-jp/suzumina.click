/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
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
        '**/*.config.{js,ts}',
        '**/dist/**',
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