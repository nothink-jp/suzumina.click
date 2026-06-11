import type { WorkPlainObject } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import Link from "next/link";

type Creators = WorkPlainObject["creators"];
type CreatorEntry = { id?: string; name: string };

interface RoleDef {
	key: "voiceActors" | "scenario" | "illustration" | "music" | "others";
	/** 詳細タブ（制作陣 Badge）の見出し */
	badgeLabel: string;
	/** サイドバー（クリエイター情報）の見出し */
	sidebarLabel: string;
	/** 詳細タブの Badge で creator リンクを張るか（従来は声優のみ） */
	badgeLinked: boolean;
}

// 5職種を1箇所に定数化（従来は職種×表示箇所で約330行の準重複だった）。
const CREATOR_ROLES: RoleDef[] = [
	{ key: "voiceActors", badgeLabel: "声優", sidebarLabel: "声優（CV）", badgeLinked: true },
	{ key: "scenario", badgeLabel: "シナリオ", sidebarLabel: "シナリオ", badgeLinked: false },
	{ key: "illustration", badgeLabel: "イラスト", sidebarLabel: "イラスト", badgeLinked: false },
	{ key: "music", badgeLabel: "音楽", sidebarLabel: "音楽", badgeLinked: false },
	{ key: "others", badgeLabel: "その他", sidebarLabel: "その他", badgeLinked: false },
];

function getEntries(creators: Creators | undefined, key: RoleDef["key"]): CreatorEntry[] {
	return (creators?.[key] as CreatorEntry[] | undefined) ?? [];
}

/**
 * 詳細タブの制作陣バッジ表示（5職種を map）。
 * 声優のみ creator ページへリンク、他職種はプレーンな Badge（従来挙動を踏襲）。
 */
export function CreatorBadges({ creators }: { creators: Creators | undefined }) {
	return (
		<div className="space-y-4">
			{CREATOR_ROLES.map((role) => {
				const entries = getEntries(creators, role.key);
				if (entries.length === 0) return null;
				return (
					<div key={role.key}>
						<div className="text-sm text-gray-700 mb-2">{role.badgeLabel}</div>
						<div className="flex flex-wrap gap-2">
							{entries.map((creator, index) =>
								role.badgeLinked && creator.id ? (
									<Link key={creator.id} href={`/creators/${creator.id}`} className="inline-block">
										<Badge
											variant="secondary"
											className="text-xs hover:bg-secondary/80 cursor-pointer"
											title={`ID: ${creator.id}`}
										>
											{creator.name}
										</Badge>
									</Link>
								) : (
									<Badge
										key={creator.id || creator.name || index}
										variant="secondary"
										className="text-xs"
										title={creator.id ? `ID: ${creator.id}` : undefined}
									>
										{creator.name}
									</Badge>
								),
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}

/**
 * サイドバーのクリエイター情報（5職種を map・avatar + リンク）。
 * 全職種で id があれば creator ページへリンク（従来挙動を踏襲）。
 */
export function CreatorList({ creators }: { creators: Creators | undefined }) {
	return (
		<div className="space-y-4">
			{CREATOR_ROLES.map((role) => {
				const entries = getEntries(creators, role.key);
				if (entries.length === 0) return null;
				return (
					<div key={role.key}>
						<h5 className="text-sm font-medium text-gray-700 mb-2">{role.sidebarLabel}</h5>
						<div className="space-y-2">
							{entries.map((creator, index) => (
								<div key={creator.id || creator.name || index} className="flex items-center gap-3">
									<div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
										<span className="text-foreground font-bold text-xs">
											{creator.name.charAt(0)}
										</span>
									</div>
									{creator.id ? (
										<Link
											href={`/creators/${creator.id}`}
											className="text-gray-900 text-sm hover:text-primary hover:underline"
											title={`ID: ${creator.id}`}
										>
											{creator.name}
										</Link>
									) : (
										<span className="text-gray-900 text-sm">{creator.name}</span>
									)}
								</div>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}
