"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { SimpleAudioButton } from "@suzumina.click/ui/components/custom/simple-audio-button";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { getFavoritesStatusAction } from "@/actions/favorites";
import { AudioButtonDeleteButton } from "./AudioButtonDeleteButton";
import { FavoriteButton } from "./FavoriteButton";

interface AudioButtonWithFavoriteClientProps {
	audioButton: FrontendAudioButtonData;
	onPlay?: () => void;
	showFavorite?: boolean;
	showDelete?: boolean;
	className?: string;
	maxTitleLength?: number;
	initialIsFavorited?: boolean;
}

export function AudioButtonWithFavoriteClient({
	audioButton,
	onPlay,
	showFavorite = true,
	showDelete = true,
	className,
	maxTitleLength,
	initialIsFavorited = false,
}: AudioButtonWithFavoriteClientProps) {
	const { data: session } = useSession();
	const router = useRouter();
	const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
	const isAuthenticated = !!session?.user;

	useEffect(() => {
		if (showFavorite && session?.user && !initialIsFavorited) {
			// Fetch favorite status if not provided
			getFavoritesStatusAction([audioButton.id]).then((statusMap) => {
				setIsFavorited(statusMap.get(audioButton.id) || false);
			});
		}
	}, [audioButton.id, session?.user, showFavorite, initialIsFavorited]);

	return (
		<div className="relative group">
			<SimpleAudioButton
				audioButton={audioButton}
				onPlay={onPlay}
				className={className}
				maxTitleLength={maxTitleLength}
				showDetailLink={true}
				onDetailClick={() => router.push(`/buttons/${audioButton.id}`)}
			/>
			{(showFavorite || showDelete) && (
				<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
					<div className="flex items-center gap-1">
						{showDelete && (
							<AudioButtonDeleteButton
								audioButtonId={audioButton.id}
								audioButtonTitle={audioButton.title}
								uploadedBy={audioButton.uploadedBy}
								variant="ghost"
								size="icon"
							/>
						)}
						{showFavorite && (
							<FavoriteButton
								audioButtonId={audioButton.id}
								isFavorited={isFavorited}
								favoriteCount={audioButton.favoriteCount}
								showCount={false}
								size="sm"
								isAuthenticated={isAuthenticated}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
