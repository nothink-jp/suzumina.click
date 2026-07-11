"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@suzumina.click/ui/components/ui/alert-dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@suzumina.click/ui/components/ui/dropdown-menu";
import { ArrowLeft, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteAudioButton } from "@/app/buttons/actions";
import { useSession } from "@/lib/auth/client";

/**
 * ヒーロー上部の行（SPR-255）: 一覧への戻りリンク + 作成者専用「…」メニュー。
 * 作成者判定は client session で行い per-user 状態を SSR に焼かない（表示ゲートのみ・SPR-223）。
 * メニューは確定済みの2項目（編集ページを開く / 削除…）。
 */

interface AudioButtonHeroHeaderProps {
	audioButtonId: string;
	buttonText: string;
	createdBy: string;
}

export function AudioButtonHeroHeader({
	audioButtonId,
	buttonText,
	createdBy,
}: AudioButtonHeroHeaderProps) {
	const router = useRouter();
	const user = useSession();
	const isCreator = !!user?.discordId && user.discordId === createdBy;
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const result = await deleteAudioButton(audioButtonId);
			if (result.success) {
				toast.success("音声ボタンを削除しました");
				router.push("/buttons");
			} else {
				toast.error(result.error || "削除に失敗しました");
				setIsDeleting(false);
			}
		} catch {
			toast.error("削除に失敗しました");
			setIsDeleting(false);
		}
	};

	return (
		<div className="flex items-center justify-between">
			<Link
				href="/buttons"
				className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:bg-suzuka-50 hover:text-suzuka-700"
			>
				<ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
				<span className="hidden sm:inline">音声ボタン一覧</span>
				<span className="sm:hidden">一覧へ</span>
			</Link>

			{isCreator ? (
				<>
					<DropdownMenu>
						<DropdownMenuTrigger
							aria-label="作成者メニュー"
							className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-suzuka-50"
						>
							<MoreHorizontal className="h-[18px] w-[18px]" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-[190px]">
							<DropdownMenuItem asChild>
								<Link href={`/buttons/${audioButtonId}/edit`}>
									<Pencil className="h-3.5 w-3.5" />
									編集ページを開く
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
								<Trash2 className="h-3.5 w-3.5" />
								削除…
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>音声ボタンを削除しますか？</AlertDialogTitle>
								<AlertDialogDescription>
									「{buttonText}」を削除します。この操作は取り消せません。
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
								<AlertDialogAction
									onClick={(e) => {
										e.preventDefault();
										void handleDelete();
									}}
									disabled={isDeleting}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									{isDeleting ? "削除中…" : "削除する"}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</>
			) : (
				/* 戻るリンクの位置を安定させるためのスペーサー */
				<span className="w-9" aria-hidden="true" />
			)}
		</div>
	);
}
