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
import { signOutAction } from "@/app/auth/actions";
import UserAvatar from "./UserAvatar";

interface UserMenuProps {
	user: UserSession;
}

export default function UserMenu({ user }: UserMenuProps) {
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
						<p className="text-xs text-muted-foreground">
							{user.role === "admin"
								? "管理者"
								: user.role === "moderator"
									? "モデレーター"
									: "メンバー"}
						</p>
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">{user.displayName}</p>
						<p className="text-xs leading-none text-muted-foreground">
							{user.role === "admin"
								? "管理者"
								: user.role === "moderator"
									? "モデレーター"
									: "メンバー"}
						</p>
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
				<DropdownMenuItem asChild>
					<form action={signOutAction} className="w-full">
						<button type="submit" className="flex items-center gap-2 w-full text-left">
							<LogOut className="h-4 w-4" />
							<span>ログアウト</span>
						</button>
					</form>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
