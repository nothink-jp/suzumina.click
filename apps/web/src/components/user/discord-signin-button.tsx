"use client";

import { trackLoginStart } from "@/lib/analytics/events";
import { markLoginFlowStarted } from "@/lib/analytics/login-funnel";
import { DiscordIcon } from "./discord-icon";

interface DiscordSignInButtonProps {
	className: string;
	iconClassName?: string;
	label: string;
}

/**
 * Discord サインインボタン（ヘッダー / signin ページで共有）。
 * 遷移自体は親の `<form action={signInAction...}>` が担い、このボタンは押下時に
 * ログインファネルの起点イベント（login_start）を送るだけの薄い層。
 */
export function DiscordSignInButton({
	className,
	iconClassName = "w-4 h-4",
	label,
}: DiscordSignInButtonProps) {
	return (
		<button
			type="submit"
			className={className}
			onClick={() => {
				trackLoginStart("discord");
				markLoginFlowStarted();
			}}
		>
			<DiscordIcon className={iconClassName} />
			<span>{label}</span>
		</button>
	);
}
