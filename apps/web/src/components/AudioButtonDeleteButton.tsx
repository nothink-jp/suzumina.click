"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAudioButton } from "@/app/buttons/actions";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

interface AudioButtonDeleteButtonProps {
	audioButtonId: string;
	audioButtonTitle: string;
	uploadedBy: string;
	variant?: "default" | "ghost" | "outline";
	size?: "default" | "sm" | "lg" | "icon";
	showLabel?: boolean;
	onDeleted?: () => void;
}

export function AudioButtonDeleteButton({
	audioButtonId,
	audioButtonTitle,
	uploadedBy,
	variant = "ghost",
	size = "sm",
	showLabel = false,
	onDeleted,
}: AudioButtonDeleteButtonProps) {
	const { data: session } = useSession();
	const router = useRouter();
	const [showConfirmDialog, setShowConfirmDialog] = useState(false);
	const [isPending, startTransition] = useTransition();

	// 削除権限チェック
	const canDelete =
		session?.user?.discordId &&
		(session.user.discordId === uploadedBy || session.user.role === "admin");

	if (!canDelete) {
		return null;
	}

	const handleDelete = () => {
		startTransition(async () => {
			try {
				const result = await deleteAudioButton(audioButtonId);

				if (result.success) {
					toast.success("音声ボタンを削除しました");
					setShowConfirmDialog(false);

					// 削除後のコールバック実行
					if (onDeleted) {
						onDeleted();
					} else {
						// デフォルト: 音声ボタン一覧に戻る
						router.push("/buttons");
					}
				} else {
					toast.error(result.error || "削除に失敗しました");
				}
			} catch (_error) {
				toast.error("削除中にエラーが発生しました");
			}
		});
	};

	return (
		<>
			<Button
				variant={variant}
				size={size}
				onClick={() => setShowConfirmDialog(true)}
				className="text-destructive hover:text-destructive hover:bg-destructive/10"
				disabled={isPending}
			>
				<Trash2 className={size === "icon" ? "h-4 w-4" : "h-3 w-3"} />
				{showLabel && <span className="ml-2">削除</span>}
			</Button>

			<DeleteConfirmDialog
				open={showConfirmDialog}
				onOpenChange={setShowConfirmDialog}
				onConfirm={handleDelete}
				title="音声ボタンを削除"
				description={`「${audioButtonTitle}」を削除してもよろしいですか？この操作は取り消せません。お気に入りに登録している他のユーザーからも削除されます。`}
				isDeleting={isPending}
			/>
		</>
	);
}
