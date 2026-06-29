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
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import UserAvatar from "./user-avatar";

interface UserMenuProps {
	user: UserSession;
}

export default function UserMenu({ user }: UserMenuProps) {
	const router = useRouter();

	// client 側 signOut で session ストアを反応的にクリアし、ヘッダー表示をリロード無しで更新する。
	// その後ホームへ戻し、サーバーコンポーネント側の per-user 表示も再取得させる。
	const handleSignOut = async () => {
		await signOut();
		router.push("/");
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
