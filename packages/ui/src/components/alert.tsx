"use client";

import { type AlertProps, Alert as HeroUIAlert } from "@heroui/react";
import { forwardRef, type ReactNode } from "react"; // Import ReactNode type

// Define status prop to map to HeroUI color
type AlertStatus = "default" | "destructive";

// HeroUI の AlertProps から color を除外し、status を追加
interface Props extends Omit<AlertProps, "color"> {
  status?: AlertStatus;
  children?: ReactNode; // Use ReactNode type directly
}

const Alert = forwardRef<HTMLDivElement, Props>(
  ({ status = "default", children, ...props }, ref) => {
    // status を HeroUI の color にマッピング
    const color = status === "destructive" ? "danger" : "default";

    return (
      <HeroUIAlert ref={ref} color={color} {...props}>
        {children}
      </HeroUIAlert>
    );
  },
);

Alert.displayName = "Alert";

// AlertTitle と AlertDescription は HeroUI の使い方に合わせて別途対応
export { Alert };
export type { AlertProps };
