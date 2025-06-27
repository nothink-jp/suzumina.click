import { auth } from "@/auth";
import { getFavoriteStatus } from "@/lib/favorites-firestore";
import { FavoriteButton } from "./FavoriteButton";

interface FavoriteButtonWrapperProps {
	audioButtonId: string;
	favoriteCount?: number;
	showCount?: boolean;
	size?: "sm" | "default" | "lg";
	className?: string;
}

export async function FavoriteButtonWrapper({
	audioButtonId,
	favoriteCount = 0,
	showCount = true,
	size = "default",
	className,
}: FavoriteButtonWrapperProps) {
	const session = await auth();
	const isAuthenticated = !!session?.user;

	let isFavorited = false;
	if (session?.user?.discordId) {
		const status = await getFavoriteStatus(session.user.discordId, audioButtonId);
		isFavorited = status.isFavorited;
	}

	return (
		<FavoriteButton
			audioButtonId={audioButtonId}
			isFavorited={isFavorited}
			favoriteCount={favoriteCount}
			showCount={showCount}
			size={size}
			className={className}
			isAuthenticated={isAuthenticated}
		/>
	);
}
