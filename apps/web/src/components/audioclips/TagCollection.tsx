"use client";

import type { TagInfo } from "@/lib/audioclips/types";
import { Tag } from "lucide-react";
import { useRouter } from "next/navigation";

interface TagCollectionProps {
  tags?: string[] | TagInfo[];
  className?: string;
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
  onClick?: (tag: string) => void;
  clickable?: boolean;
}

/**
 * タグコレクション表示コンポーネント
 *
 * クリップに設定されたタグをバッジとして表示します。
 * クリック可能な場合、タグをクリックすると検索ページに遷移します。
 */
export default function TagCollection({
  tags = [],
  className = "",
  maxDisplay = 5,
  size = "md",
  onClick,
  clickable = true,
}: TagCollectionProps) {
  const router = useRouter();

  // タグが配列でない場合や空の場合は表示しない
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  // TagInfoの配列とstring[]の両方に対応
  const normalizedTags = tags.map((tag) =>
    typeof tag === "string" ? tag : tag.text,
  );

  // 表示するタグを制限
  const displayTags = normalizedTags.slice(0, maxDisplay);
  const hasMore = normalizedTags.length > maxDisplay;

  // サイズに応じたクラス
  const sizeClasses = {
    sm: "badge-xs text-xs",
    md: "badge-sm text-sm",
    lg: "badge-md text-md",
  };

  // タグクリック時の処理
  const handleTagClick = (tag: string) => {
    if (!clickable) return;

    if (onClick) {
      onClick(tag);
      return;
    }

    // デフォルトでは検索ページに遷移
    router.push(`/search?tags=${encodeURIComponent(tag)}`);
  };

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      <Tag
        className="h-4 w-4 text-secondary mr-1 self-center"
        aria-hidden="true"
      />

      {displayTags.map((tag, index) => (
        <button
          type="button"
          key={`tag-${index}-${tag}`}
          onClick={() => handleTagClick(tag)}
          className={`
            badge badge-outline badge-secondary no-animation
            transition-colors hover:bg-secondary hover:text-secondary-content
            ${clickable ? "cursor-pointer" : "cursor-default"}
            ${sizeClasses[size]}
          `}
          disabled={!clickable}
          aria-label={clickable ? `"${tag}"タグで検索` : `タグ: ${tag}`}
        >
          {tag}
        </button>
      ))}

      {hasMore && (
        <span
          className={`badge badge-outline badge-neutral ${sizeClasses[size]}`}
          aria-label="追加のタグあり"
        >
          +{normalizedTags.length - maxDisplay}
        </span>
      )}
    </div>
  );
}
