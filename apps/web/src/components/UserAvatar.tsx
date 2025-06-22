"use client";

import { createDiscordAvatarUrl } from "@suzumina.click/shared-types";

interface UserAvatarProps {
  discordId: string;
  avatar: string | null | undefined;
  displayName: string;
  size?: number;
  className?: string;
}

export default function UserAvatar({
  discordId,
  avatar,
  displayName,
  size = 32,
  className = "",
}: UserAvatarProps) {
  const avatarUrl = createDiscordAvatarUrl(discordId, avatar, size);
  const fallbackUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(discordId) % 5}.png`;

  return (
    <img
      src={avatarUrl}
      alt={`${displayName}のアバター`}
      className={`rounded-full ${className}`}
      onError={(e) => {
        // フォールバック画像
        e.currentTarget.src = fallbackUrl;
      }}
    />
  );
}
