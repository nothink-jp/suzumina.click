"use client";

import {
  type CardProps,
  Card as HeroUICard,
  CardBody as HeroUICardBody,
  CardFooter as HeroUICardFooter,
  CardHeader as HeroUICardHeader,
} from "@heroui/react";
import { forwardRef } from "react"; // Keep for Card
import type { FC, HTMLAttributes } from "react"; // Explicitly import FC and HTMLAttributes

// --- Card ---
const Card = forwardRef<HTMLDivElement, CardProps>(({ ...props }, ref) => {
  return <HeroUICard ref={ref} {...props} />;
});
Card.displayName = "Card";

// --- CardHeader ---
// Use FC and HTMLAttributes directly
const CardHeader: FC<HTMLAttributes<HTMLDivElement>> = ({ ...props }) => {
  // Pass props directly, assuming HeroUICardHeader accepts standard HTML attributes
  return <HeroUICardHeader {...props} />;
};
CardHeader.displayName = "CardHeader";

// --- CardBody (replaces CardContent) ---
// Use FC and HTMLAttributes directly
const CardBody: FC<HTMLAttributes<HTMLDivElement>> = ({ ...props }) => {
  return <HeroUICardBody {...props} />;
};
CardBody.displayName = "CardBody";

// --- CardFooter ---
// Use FC and HTMLAttributes directly
const CardFooter: FC<HTMLAttributes<HTMLDivElement>> = ({ ...props }) => {
  return <HeroUICardFooter {...props} />;
};
CardFooter.displayName = "CardFooter";

// CardTitle and CardDescription are removed.

export {
  Card,
  CardHeader,
  CardBody, // Exporting as CardBody
  CardFooter,
};

// Export underlying CardProps type if needed
export type { CardProps };
