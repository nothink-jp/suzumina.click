"use client";
import type { HTMLAttributes, FC } from "react";
 
export interface CardProps extends HTMLAttributes<HTMLDivElement> {}
 
export const Card: FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <div className={`rounded-lg border p-4 shadow ${className || ""}`} {...props}>
      {children}
    </div>
  );
};
