import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { SimpleAudioButton } from "@suzumina.click/ui/components/custom/simple-audio-button";
import { auth } from "@/auth";
import { getFavoriteStatus } from "@/lib/favorites-firestore";
import { FavoriteButton } from "./FavoriteButton";

interface AudioButtonWithFavoriteProps {
	audioButton: FrontendAudioButtonData;
	onPlay?: () => void;
	showFavorite?: boolean;
	className?: string;
	maxTitleLength?: number;
}

export async function AudioButtonWithFavorite({
	audioButton,
	onPlay,
	showFavorite = true,
	className,
	maxTitleLength,
}: AudioButtonWithFavoriteProps) {
	const session = await auth();
	const isAuthenticated = !!session?.user;

	let isFavorited = false;
	if (showFavorite && session?.user?.discordId) {
		const status = await getFavoriteStatus(session.user.discordId, audioButton.id);
		isFavorited = status.isFavorited;
	}

	return (
		<div className="relative group">
			<SimpleAudioButton
				audioButton={audioButton}
				onPlay={onPlay}
				className={className}
				maxTitleLength={maxTitleLength}
			/>
			{showFavorite && (
				<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
					<FavoriteButton
						audioButtonId={audioButton.id}
						isFavorited={isFavorited}
						favoriteCount={audioButton.favoriteCount}
						showCount={false}
						size="sm"
						isAuthenticated={isAuthenticated}
					/>
				</div>
			)}
		</div>
	);
}
