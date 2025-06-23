"use client";

import { createDiscordAvatarUrl } from "@suzumina.click/shared-types";
import Image from "next/image";

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
  const fallbackUrl = `https://cdn.discordapp.com/embed/avatars/${Number.parseInt(discordId) % 5}.png`;

  return (
    <Image
      src={avatarUrl}
      alt={`${displayName}のアバター`}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={(e) => {
        // フォールバック画像
        e.currentTarget.src = fallbackUrl;
      }}
    />
  );
}
