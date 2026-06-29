"use client";

import type { UserSession } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@suzumina.click/ui/components/ui/dropdown-menu";
import { Heart, LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isAuthGatedPath } from "@/lib/auth/auth-redirect";
import { signOut } from "@/lib/auth/client";
import * as logger from "@/lib/logger";
import UserAvatar from "./user-avatar";

interface UserMenuProps {
	user: UserSession;
}

export default function UserMenu({ user }: UserMenuProps) {
	const router = useRouter();
	const pathname = usePathname();

	// client 側 signOut で session ストアを反応的にクリアし、ヘッダー表示をリロード無しで更新する。
	// 遷移先: 認証必須ページに居たらログアウト後は留まれないのでトップへ。公開ページならその場に留まる
	// （ログインの「現在地へ戻る」と挙動を一貫させる）。いずれも refresh でサーバー側 per-user を再取得。
	// signOut 失敗時（ネットワーク等）もログのみで遷移は続行する: 続く refresh が実セッション状態に
	// 再同期するため、見た目だけログアウトする不整合を避けられる。
	const handleSignOut = async () => {
		try {
			await signOut();
		} catch (error) {
			logger.error("ログアウトに失敗しました", {
				action: "signOut",
				error: error instanceof Error ? error.message : String(error),
			});
		}
		if (isAuthGatedPath(pathname)) {
			router.push("/");
		}
		router.refresh();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="flex items-center gap-2 h-auto p-2"
					aria-label="ユーザーメニューを開く"
				>
					<UserAvatar
						discordId={user.discordId}
						avatar={user.avatar}
						displayName={user.displayName}
						size={32}
						className="w-8 h-8"
					/>
					<div className="hidden sm:block text-left">
						<p className="text-sm font-medium text-foreground">{user.displayName}</p>
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">{user.displayName}</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/users/me" className="flex items-center gap-2 cursor-pointer">
						<User className="h-4 w-4" />
						<span>マイページ</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href="/favorites" className="flex items-center gap-2 cursor-pointer">
						<Heart className="h-4 w-4" />
						<span>お気に入り</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href="/settings" className="flex items-center gap-2 cursor-pointer">
						<Settings className="h-4 w-4" />
						<span>設定</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					// asChild を使わず DropdownMenuItem 自体を押下対象にする（選択でメニューは閉じる）。
					onSelect={() => void handleSignOut()}
					className="flex items-center gap-2 cursor-pointer"
				>
					<LogOut className="h-4 w-4" />
					<span>ログアウト</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
