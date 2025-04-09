"use client";

import { type ButtonProps, Button as HeroUIButton } from "@heroui/react";
import { forwardRef } from "react"; // Import only forwardRef

// Removed empty interface Props extends ButtonProps {}

// Use ButtonProps directly in forwardRef
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  // Use forwardRef directly
  ({ children, ...props }, ref) => {
    return (
      <HeroUIButton ref={ref} {...props}>
        {children}
      </HeroUIButton>
    );
  },
);

Button.displayName = "Button";

// buttonVariants は HeroUI では不要なため削除
export { Button };
export type { ButtonProps }; // 必要に応じて HeroUI の Props 型もエクスポート
