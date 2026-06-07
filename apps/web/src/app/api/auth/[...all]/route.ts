/**
 * better-auth の Next.js ハンドラ（SPR-158 Phase 3 / 本番唯一）
 *
 * `/api/auth/*` にマウント。Discord redirect URI は `<origin>/api/auth/callback/discord`
 * （移行前から登録済みの URI をそのまま流用）。
 */
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/better-auth/auth";

export const { GET, POST } = toNextJsHandler(auth);
