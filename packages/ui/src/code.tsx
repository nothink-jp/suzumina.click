"use client";
import type { FC, HTMLAttributes } from "react";

export interface CodeProps extends HTMLAttributes<HTMLElement> {}

export const Code: FC<CodeProps> = ({ className, children, ...props }) => {
  return (
    <code className={`font-mono bg-gray-100 p-1 rounded ${className || ""}`} {...props}>
      {children}
    </code>
  );
};
