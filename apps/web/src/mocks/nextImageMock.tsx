import React, { type JSX } from "react";

/**
 * Next.jsのImageコンポーネントのモック実装
 * Storybookでのレンダリングのために通常のimgタグに変換します
 */
interface ImageProps {
  src: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  [key: string]: unknown;
}

export default function Image({
  src,
  alt,
  width,
  height,
  className,
  ...props
}: ImageProps): JSX.Element {
  return (
    <img
      src={src}
      alt={alt || "Image"}
      width={width}
      height={height}
      className={className}
      aria-hidden={!alt}
      {...props}
    />
  );
}
