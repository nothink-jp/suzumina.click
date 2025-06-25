"use server";

import { signIn, signOut } from "@/auth";
import * as logger from "@/lib/logger";

export async function signInAction() {
	logger.info("Discordサインイン開始", { action: "signInAction" });

	try {
		await signIn("discord", { redirectTo: "/" });
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

export async function signOutAction() {
	logger.info("サインアウト開始", { action: "signOutAction" });

	try {
		await signOut({ redirectTo: "/" });
		logger.info("サインアウト成功", { action: "signOutAction" });
	} catch (error) {
		logger.error("サインアウトでエラーが発生", {
			action: "signOutAction",
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error;
	}
}
