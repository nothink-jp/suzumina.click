"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/auth/client";

interface AudioButtonEditButtonProps {
	/** 音声ボタンID */
	audioButtonId: string;
	/** 作成者の Discord ID（公開データ） */
	createdBy: string;
}

/**
 * 音声ボタン編集ボタン（作成者のみ表示）。
 * 作成者判定は client の session で行い、per-user 状態を SSR に焼かない（純公開 shell・SPR-223）。
 * 実際の編集権限は編集ページ/Server Action 側の認可で担保する（ここは表示ゲートのみ）。
 */
export function AudioButtonEditButton({ audioButtonId, createdBy }: AudioButtonEditButtonProps) {
	const user = useSession();
	const canEdit = user?.discordId && user.discordId === createdBy;

	if (!canEdit) {
		return null;
	}

	return (
		<Button
			variant="outline"
			size="sm"
			className="flex items-center gap-1"
			render={
				<Link href={`/buttons/${audioButtonId}/edit`}>
					<Pencil className="h-4 w-4" />
					編集
				</Link>
			}
		/>
	);
}
