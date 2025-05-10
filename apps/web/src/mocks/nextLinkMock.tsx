import type React from "react";
import type { JSX } from "react";

/**
 * Next.jsのLinkコンポーネントのモック実装
 * Storybookでのレンダリングのために通常のアンカータグに変換します
 */
interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

export default function Link({
  href,
  children,
  className,
  ...props
}: LinkProps): JSX.Element {
  return (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  );
}
