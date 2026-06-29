"use server";

import { signInWithDiscord } from "@/lib/auth/server";
import * as logger from "@/lib/logger";

export async function signInAction() {
	logger.info("Discordサインイン開始", { action: "signInAction" });

	try {
		await signInWithDiscord("/");
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
