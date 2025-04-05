import { mock } from "bun:test";
import type { NextAuthConfig } from "next-auth";
import { callbacks } from "../../src/auth/callbacks";

// NextAuthの初期化をモック
export const mockNextAuth = {
  handlers: {
    GET: async () => new Response(),
    POST: async () => new Response(),
  },
  auth: async () => null,
  signIn: async () => null,
  signOut: async () => null,
  callbacks,
} as const;

// モジュールをモック化
mock.module("next-auth", () => ({
  default: () => mockNextAuth,
}));

// モジュールのエクスポート
export const { auth, signIn, signOut } = mockNextAuth;
