"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { AudioButton } from "@suzumina.click/ui/components/custom/audio-button";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleFavoriteAction } from "@/actions/favorites";

interface AudioButtonWithFavoriteClientProps {
	audioButton: FrontendAudioButtonData;
	onPlay?: () => void;
	showFavorite?: boolean;
	className?: string;
	maxTitleLength?: number;
	initialIsFavorited?: boolean;
	searchQuery?: string;
	highlightClassName?: string;
}

export function AudioButtonWithFavoriteClient({
	audioButton,
	onPlay,
	showFavorite = true,
	className,
	maxTitleLength,
	initialIsFavorited = false,
	searchQuery,
	highlightClassName,
}: AudioButtonWithFavoriteClientProps) {
	const { data: session } = useSession();
	const router = useRouter();
	const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
	const [_isPending, startTransition] = useTransition();
	const isAuthenticated = !!session?.user;

	useEffect(() => {
		// initialIsFavoritedが提供されている場合はそれを使用（一括取得済み）
		setIsFavorited(initialIsFavorited);
	}, [initialIsFavorited]);

	const handleFavoriteToggle = useCallback(() => {
		if (!isAuthenticated) {
			toast.error("お気に入りに追加するにはログインが必要です");
			return;
		}

		startTransition(async () => {
			try {
				const result = await toggleFavoriteAction(audioButton.id);
				if (result.success) {
					setIsFavorited(result.isFavorited ?? false);
					toast.success(
						result.isFavorited ? "お気に入りに追加しました" : "お気に入りから削除しました",
					);
				} else {
					toast.error(result.error || "エラーが発生しました");
				}
			} catch (_error) {
				toast.error("エラーが発生しました");
			}
		});
	}, [audioButton.id, isAuthenticated]);

	return (
		<AudioButton
			audioButton={audioButton}
			onPlay={onPlay}
			className={className}
			maxTitleLength={maxTitleLength}
			showDetailLink={true}
			onDetailClick={() => router.push(`/buttons/${audioButton.id}`)}
			isFavorite={isFavorited}
			onFavoriteToggle={showFavorite && isAuthenticated ? handleFavoriteToggle : undefined}
			searchQuery={searchQuery}
			highlightClassName={highlightClassName}
		/>
	);
}
