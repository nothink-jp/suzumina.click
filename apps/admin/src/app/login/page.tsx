import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@suzumina.click/ui/components/ui/card";
import { AlertTriangle, Shield } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginButton } from "@/components/LoginButton";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
	// 既にログイン済みの場合はダッシュボードにリダイレクト
	const session = await auth();
	if (session?.user?.isAdmin) {
		redirect("/");
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50 to-minase-50 flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto mb-4 p-3 bg-suzuka-100 rounded-full w-fit">
						<Shield className="h-8 w-8 text-suzuka-600" />
					</div>
					<CardTitle className="text-2xl font-bold">suzumina.click 管理者</CardTitle>
					<CardDescription>管理者専用システムにアクセスするには、認証が必要です</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
						<div className="flex items-start gap-2">
							<AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
							<div className="text-sm text-yellow-800">
								<p className="font-medium">制限されたアクセス</p>
								<p>このシステムは認可された管理者のみがアクセスできます。</p>
							</div>
						</div>
					</div>

					<LoginButton />

					<div className="text-center text-sm text-muted-foreground">
						<p>suzumina.click v0.2.2</p>
						<p>涼花みなせファンコミュニティ 管理システム</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
