import { Button } from "@suzumina.click/ui/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AudioButtonDetailHeaderProps {
	title: string;
}

export function AudioButtonDetailHeader({ title }: AudioButtonDetailHeaderProps) {
	return (
		<div className="container mx-auto px-4 py-4">
			<nav aria-label="パンくずリスト" className="text-sm mb-2">
				<ol className="flex items-center space-x-2 text-muted-foreground min-w-0">
					<li className="shrink-0">
						<Link href="/" className="hover:text-foreground transition-colors">
							ホーム
						</Link>
					</li>
					<li className="shrink-0">
						<span className="mx-1">/</span>
					</li>
					<li className="shrink-0">
						<Link href="/buttons" className="hover:text-foreground transition-colors">
							音声ボタン一覧
						</Link>
					</li>
					<li className="shrink-0">
						<span className="mx-1">/</span>
					</li>
					<li className="text-foreground font-medium truncate min-w-0 max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px]">
						{title}
					</li>
				</ol>
			</nav>
			<Button variant="ghost" size="sm" asChild>
				<Link href="/buttons" className="flex items-center gap-2 hover:text-suzuka-600">
					<ArrowLeft className="h-4 w-4" />
					音声ボタン一覧に戻る
				</Link>
			</Button>
		</div>
	);
}
