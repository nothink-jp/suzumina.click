import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface StatCardProps {
	title: string;
	icon: LucideIcon;
	mainValue: number | string;
	mainLabel: string;
	badges?: {
		label: string;
		value: number | string;
		variant?: "default" | "secondary" | "destructive" | "outline";
	}[];
	actionButton?: {
		label: string;
		href: string;
	};
	additionalInfo?: ReactNode;
	className?: string;
	iconColor?: string;
}

export function StatCard({
	title,
	icon: Icon,
	mainValue,
	mainLabel,
	badges,
	actionButton,
	additionalInfo,
	className = "",
	iconColor = "text-suzuka-500",
}: StatCardProps) {
	return (
		<Card className={`hover:shadow-md transition-shadow ${className}`}>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-sm font-medium">
					<Icon className={`h-4 w-4 ${iconColor}`} />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					<div className="flex items-baseline gap-2">
						<span className="text-2xl font-bold">{mainValue}</span>
						<span className="text-sm text-muted-foreground">{mainLabel}</span>
					</div>

					{badges && badges.length > 0 && (
						<div className="flex flex-wrap items-center gap-2">
							{badges.map((badge) => (
								<Badge
									key={`${badge.label}-${badge.value}`}
									variant={badge.variant || "secondary"}
									className="text-xs"
								>
									{badge.label}: {badge.value}
								</Badge>
							))}
						</div>
					)}

					{additionalInfo && <div className="flex items-center gap-2">{additionalInfo}</div>}

					{actionButton && (
						<Button variant="outline" size="sm" asChild className="w-full mt-3">
							<Link href={actionButton.href}>{actionButton.label}</Link>
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
