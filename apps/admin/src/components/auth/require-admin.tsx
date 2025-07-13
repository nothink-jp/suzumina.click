import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";

interface RequireAdminProps {
	children: ReactNode;
	fallback?: ReactNode;
}

export async function RequireAdmin({ children, fallback }: RequireAdminProps) {
	const session = await auth();

	if (!session?.user) {
		redirect("/login");
	}

	if (!session.user.isAdmin) {
		if (fallback) {
			return <>{fallback}</>;
		}
		redirect("/login");
	}

	return <>{children}</>;
}

export function UnauthorizedMessage() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="text-center">
				<h1 className="text-2xl font-bold text-destructive mb-4">アクセス権限がありません</h1>
				<p className="text-muted-foreground">このページにアクセスするには管理者権限が必要です。</p>
			</div>
		</div>
	);
}
