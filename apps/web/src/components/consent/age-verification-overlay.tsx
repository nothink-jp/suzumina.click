"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { AlertTriangle, Calendar, Heart, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useAgeVerification } from "@/contexts/age-verification-context";

const BOT_UA_PATTERN =
	/googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkshare|w3c_validator|whatsapp/i;

/**
 * Client-side overlay that prompts age verification without blocking content render.
 * Renders nothing until the provider's localStorage check resolves, then either
 * stays hidden (verified / bot) or shows a fixed-position confirmation card.
 */
export function AgeVerificationOverlay() {
	const { isAgeVerified, isLoading, updateAgeVerification } = useAgeVerification();
	const [showMinorMessage, setShowMinorMessage] = useState(false);
	const [botChecked, setBotChecked] = useState(false);

	useEffect(() => {
		if (BOT_UA_PATTERN.test(navigator.userAgent)) {
			updateAgeVerification(true);
		}
		setBotChecked(true);
	}, [updateAgeVerification]);

	const visible = !isLoading && botChecked && (!isAgeVerified || showMinorMessage);

	useEffect(() => {
		if (!visible) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [visible]);

	if (!visible) return null;

	const handleAgeConfirmation = (isAdult: boolean) => {
		if (isAdult) {
			updateAgeVerification(true);
			return;
		}
		updateAgeVerification(false);
		setShowMinorMessage(true);
		setTimeout(() => {
			window.location.href = "/";
		}, 3000);
	};

	if (showMinorMessage) {
		return (
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="age-verification-minor-title"
				className="fixed inset-0 z-50 flex items-center justify-center suzuka-gradient p-4"
			>
				<Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur-sm shadow-xl">
					<CardHeader className="text-center pb-4">
						<div className="mx-auto w-16 h-16 bg-suzuka-100 rounded-full flex items-center justify-center mb-4">
							<Shield className="h-8 w-8 text-suzuka-600" />
						</div>
						<CardTitle
							id="age-verification-minor-title"
							className="text-xl font-bold text-foreground"
						>
							ありがとうございます
						</CardTitle>
					</CardHeader>

					<CardContent className="space-y-6">
						<div className="text-center space-y-4">
							<p className="text-sm text-muted-foreground leading-relaxed">
								安全なご利用のため、年齢制限のない
								<br />
								コンテンツのみご利用いただけます。
							</p>
							<div className="flex items-center justify-center gap-2 text-xs text-suzuka-600">
								<Heart className="h-3 w-3" />
								<span>全年齢対象のコンテンツをお楽しみください</span>
							</div>
							<div className="text-xs text-muted-foreground/70 text-center">
								3秒後にトップページに移動します...
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="age-verification-title"
			className="fixed inset-0 z-50 flex items-center justify-center suzuka-gradient p-4"
		>
			<Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur-sm shadow-xl">
				<CardHeader className="text-center pb-4">
					<div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
						<AlertTriangle className="h-8 w-8 text-amber-600" />
					</div>
					<CardTitle id="age-verification-title" className="text-xl font-bold text-foreground">
						年齢確認
					</CardTitle>
				</CardHeader>

				<CardContent className="space-y-6">
					<div className="text-center space-y-3">
						<p className="text-sm text-muted-foreground leading-relaxed">
							このサイトには18歳未満の方には適さない
							<br />
							コンテンツが含まれています。
						</p>
						<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
							<Calendar className="h-3 w-3" />
							<span>あなたは18歳以上ですか？</span>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<Button
							variant="outline"
							onClick={() => handleAgeConfirmation(false)}
							className="w-full border-suzuka-200 text-suzuka-700 hover:bg-suzuka-50"
						>
							18歳未満
						</Button>
						<Button
							onClick={() => handleAgeConfirmation(true)}
							className="w-full bg-suzuka-600 hover:bg-suzuka-700 text-white"
						>
							18歳以上
						</Button>
					</div>

					<div className="text-xs text-muted-foreground text-center leading-relaxed">
						この確認は法的要件に基づくものです。
						<br />
						30日間記憶され、期限後に再確認が必要です。
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
