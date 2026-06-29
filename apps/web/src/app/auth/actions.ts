"use server";

import { unstable_rethrow } from "next/navigation";
import { signInWithDiscord } from "@/lib/auth/server";
import * as logger from "@/lib/logger";

// callbackURL はログイン後の戻り先（client から現在地パスを bind して渡す）。
// サニタイズは chokepoint の signInWithDiscord 側で行う。
export async function signInAction(callbackURL = "/") {
	logger.info("Discordサインイン開始", { action: "signInAction" });

	try {
		// 成功時は signInWithDiscord 内の redirect() が NEXT_REDIRECT を throw する（後続には到達しない）。
		await signInWithDiscord(callbackURL);
	} catch (error) {
		// redirect/notFound 等のフレームワーク例外はそのまま投げ直す（エラーログに混入させない）。
		unstable_rethrow(error);
		logger.error("Discordサインインでエラーが発生", {
			action: "signInAction",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
}
