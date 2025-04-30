/**
 * 環境変数と設定の管理モジュールのテスト
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getFirestoreConfig, getSecret, isEmulatorMode } from './config';

describe('設定モジュール', () => {
  // 環境変数のモックを保存
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // テスト前に環境変数をリセット
    vi.resetModules();
  });

  afterEach(() => {
    // テスト後に環境変数を元に戻す
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe('getSecret', () => {
    it('環境変数が存在する場合、その値を返すこと', () => {
      // 環境変数をセット
      process.env.TEST_SECRET = 'テスト値';
      
      // 関数を実行
      const result = getSecret('TEST_SECRET');
      
      // 期待する結果
      expect(result).toBe('テスト値');
    });

    it('環境変数が存在しない場合、空文字を返すこと', () => {
      // 環境変数が未設定の状態
      process.env.TEST_SECRET = undefined;
      
      // 関数を実行
      const result = getSecret('TEST_SECRET');
      
      // 期待する結果
      expect(result).toBe('');
    });
  });

  describe('getFirestoreConfig', () => {
    it('エミュレータモードの場合、エミュレータ接続設定を返すこと', () => {
      // エミュレータモードをセット
      process.env.FUNCTIONS_EMULATOR = 'true';
      
      // 関数を実行
      const config = getFirestoreConfig();
      
      // 期待する結果
      expect(config).toEqual({
        useEmulator: true,
        host: 'localhost',
        port: 8080,
      });
    });

    it('本番環境の場合、空のオブジェクトを返すこと', () => {
      // 本番環境設定（エミュレータフラグを削除）
      process.env.FUNCTIONS_EMULATOR = undefined;
      
      // 関数を実行
      const config = getFirestoreConfig();
      
      // 期待する結果
      expect(config).toEqual({});
    });
  });

  describe('isEmulatorMode', () => {
    it('FUNCTIONS_EMULATOR=trueの場合、trueを返すこと', () => {
      // エミュレータモードをセット
      process.env.FUNCTIONS_EMULATOR = 'true';
      
      // 関数を実行・検証
      expect(isEmulatorMode()).toBe(true);
    });

    it('FUNCTIONS_EMULATORが設定されていない場合、falseを返すこと', () => {
      // エミュレータフラグを削除
      process.env.FUNCTIONS_EMULATOR = undefined;
      
      // 関数を実行・検証
      expect(isEmulatorMode()).toBe(false);
    });
  });
});