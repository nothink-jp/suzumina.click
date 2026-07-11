import Image from "next/image";
import Link from "next/link";
import { getUserByDiscordId } from "@/lib/user-firestore";

/**
 * 作成者カード（SPR-255）: アバター（無ければイニシャル）+ 名前 + 参加時期 + プロフィール導線。
 * user が取得できない場合はイニシャルと名前のみで縮退表示する。
 */

interface CreatorCardProps {
	createdBy: string;
	createdByName: string;
}

export async function CreatorCard({ createdBy, createdByName }: CreatorCardProps) {
	const user = await getUserByDiscordId(createdBy).catch(() => null);
	const displayName = user?.displayName || createdByName;
	const initial = displayName.slice(0, 1) || "?";

	return (
		<section className="flex items-center gap-3 rounded-[20px] border border-border bg-card px-[18px] py-4">
			{user?.avatarUrl ? (
				<Image
					src={user.avatarUrl}
					alt={displayName}
					width={44}
					height={44}
					className="h-11 w-11 flex-none rounded-full object-cover"
					unoptimized
				/>
			) : (
				<div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-minase-200 text-lg font-extrabold text-minase-900">
					{initial}
				</div>
			)}
			<div className="min-w-0 flex-1 text-left">
				<p className="text-sm font-extrabold">{displayName}</p>
				{user?.memberSince && (
					<p className="mt-0.5 text-xs text-muted-foreground">{user.memberSince}から</p>
				)}
			</div>
			<Link
				href={`/users/${createdBy}`}
				className="flex-none text-[12.5px] font-bold text-primary hover:text-suzuka-700"
			>
				プロフィール
			</Link>
		</section>
	);
}
