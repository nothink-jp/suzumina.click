/**
 * better-auth の Next.js ハンドラ（SPR-156 Phase 1 / 別 basePath で並存）
 *
 * 既存 NextAuth は `/api/auth/[...nextauth]` のまま無改変。
 * better-auth は `/api/ba-auth/*` にマウント（同一階層の catch-all 衝突を避けるため別 basePath）。
 * Discord の redirect URI は `<origin>/api/ba-auth/callback/discord`。
 */
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/better-auth/auth";

export const { GET, POST } = toNextJsHandler(auth);
