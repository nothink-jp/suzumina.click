"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

interface ErrorDisplayProps {
	title?: string;
	message?: string;
	error?: Error;
	onRetry?: () => void;
	showDetails?: boolean;
}

export function ErrorDisplay({
	title = "エラーが発生しました",
	message = "予期しない問題が発生しました。しばらくしてからお試しください。",
	error,
	onRetry,
	showDetails = false,
}: ErrorDisplayProps) {
	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center p-8">
			<div className="text-center max-w-md">
				<AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
				<h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
				<p className="text-muted-foreground mb-6">{message}</p>

				{showDetails && error && (
					<details className="text-left mb-6">
						<summary className="cursor-pointer text-sm text-muted-foreground mb-2">
							エラーの詳細を表示
						</summary>
						<pre className="text-xs bg-muted p-3 rounded overflow-auto">
							{error.message}
							{error.stack && (
								<>
									{"\n\n"}
									{error.stack}
								</>
							)}
						</pre>
					</details>
				)}

				{onRetry && (
					<Button onClick={onRetry} className="gap-2">
						<RefreshCw className="h-4 w-4" />
						再試行
					</Button>
				)}
			</div>
		</div>
	);
}

interface LoadingDisplayProps {
	message?: string;
}

export function LoadingDisplay({ message = "読み込み中..." }: LoadingDisplayProps) {
	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center p-8">
			<div className="text-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
				<p className="text-muted-foreground">{message}</p>
			</div>
		</div>
	);
}

interface EmptyStateProps {
	title?: string;
	message?: string;
	action?: ReactNode;
	icon?: ReactNode;
}

export function EmptyState({
	title = "データがありません",
	message = "表示するデータが見つかりませんでした。",
	action,
	icon,
}: EmptyStateProps) {
	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center p-8">
			<div className="text-center max-w-md">
				{icon || <div className="h-12 w-12 rounded-full bg-muted mx-auto mb-4" />}
				<h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
				<p className="text-muted-foreground mb-6">{message}</p>
				{action}
			</div>
		</div>
	);
}
