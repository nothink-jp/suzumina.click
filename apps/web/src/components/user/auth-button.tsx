"use client";

import type { UserSession } from "@suzumina.click/shared-types";
import { usePathname } from "next/navigation";
import { signInAction } from "@/app/auth/actions";
import { DiscordSignInButton } from "./discord-signin-button";
import UserMenu from "./user-menu";

interface AuthButtonProps {
	user?: UserSession | null;
}

export default function AuthButton({ user }: AuthButtonProps) {
	// ログイン後は現在地（公開ページ）へ戻す。pathname を server action に bind して渡す
	// （サニタイズは signInWithDiscord 側 chokepoint）。フックは早期 return より前で呼ぶ。
	const pathname = usePathname();
	const signInWithCallback = signInAction.bind(null, pathname);

	if (user) {
		return <UserMenu user={user} />;
	}

	return (
		<form action={signInWithCallback}>
			<DiscordSignInButton
				className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-lg transition-colors duration-200"
				label="Discordログイン"
			/>
		</form>
	);
}
