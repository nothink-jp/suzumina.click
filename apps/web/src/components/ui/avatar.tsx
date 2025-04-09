"use client";

import { type AvatarProps, Avatar as HeroUIAvatar } from "@heroui/react";
import { forwardRef } from "react";

// Removed empty interface Props extends AvatarProps {}

// Use AvatarProps directly in forwardRef
const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(({ ...props }, ref) => {
  // HeroUI Avatar は src や name プロパティで画像やフォールバックを処理
  return <HeroUIAvatar ref={ref} {...props} />;
});

Avatar.displayName = "Avatar";

// AvatarImage と AvatarFallback は HeroUI Avatar が内部で処理するため不要
export { Avatar };
export type { AvatarProps };
