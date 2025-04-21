/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// Vitest 3.1.1のワークスペース設定
// 詳細: https://vitest.dev/guide/workspace
// ワークスペース設定ファイルはプロジェクトパスの配列をエクスポートする必要があります

// 型定義を追加して、配列であることを明示
const workspace: string[] = [
  // webアプリケーション（モノレポ構造）
  './apps/web/vitest.config.ts',
  
  // functionsディレクトリ
  './functions',

  // Storybookテスト（コメントアウト中）
  // './.storybook',
];

export default workspace;
