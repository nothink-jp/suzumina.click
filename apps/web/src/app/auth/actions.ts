"use server";

import { signInWithDiscord } from "@/lib/auth/server";
import * as logger from "@/lib/logger";

// callbackURL はログイン後の戻り先（client から現在地パスを bind して渡す）。
// サニタイズは chokepoint の signInWithDiscord 側で行う。
export async function signInAction(callbackURL = "/") {
	logger.info("Discordサインイン開始", { action: "signInAction" });

	try {
		await signInWithDiscord(callbackURL);
		logger.info("Discordサインイン成功", { action: "signInAction" });
	} catch (error) {
		logger.error("Discordサインインでエラーが発生", {
			action: "signInAction",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
}
