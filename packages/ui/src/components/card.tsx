"use client";

import {
  type CardProps,
  Card as HeroUICard,
  CardBody as HeroUICardBody,
  CardFooter as HeroUICardFooter,
  CardHeader as HeroUICardHeader,
  // Removed CardHeaderProps, CardBodyProps, CardFooterProps imports
} from "@heroui/react";
import { forwardRef } from "react"; // Keep for Card
import type * as React from "react"; // For HTMLAttributes

// --- Card ---
// Keep forwardRef for the main Card component
// Removed empty interface CardComponentProps extends CardProps {}
// Use CardProps directly in forwardRef
const Card = forwardRef<HTMLDivElement, CardProps>(({ ...props }, ref) => {
  return <HeroUICard ref={ref} {...props} />;
});
Card.displayName = "Card";

// --- CardHeader ---
// Remove forwardRef as HeroUICardHeader likely doesn't accept it
interface CardHeaderComponentProps
  extends React.HTMLAttributes<HTMLDivElement> {}
const CardHeader: React.FC<CardHeaderComponentProps> = ({ ...props }) => {
  // Pass props directly, assuming HeroUICardHeader accepts standard HTML attributes
  return <HeroUICardHeader {...props} />;
};
CardHeader.displayName = "CardHeader";

// --- CardBody (replaces CardContent) ---
// Remove forwardRef
interface CardBodyComponentProps extends React.HTMLAttributes<HTMLDivElement> {}
const CardBody: React.FC<CardBodyComponentProps> = ({ ...props }) => {
  return <HeroUICardBody {...props} />;
};
CardBody.displayName = "CardBody";

// --- CardFooter ---
// Remove forwardRef
interface CardFooterComponentProps
  extends React.HTMLAttributes<HTMLDivElement> {}
const CardFooter: React.FC<CardFooterComponentProps> = ({ ...props }) => {
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
