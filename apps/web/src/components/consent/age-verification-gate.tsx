"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { AlertTriangle, Calendar, Heart, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useAgeVerification } from "@/contexts/age-verification-context";

interface AgeVerificationGateProps {
	children: React.ReactNode;
}

export function AgeVerificationGate({ children }: AgeVerificationGateProps) {
	const { isAgeVerified, updateAgeVerification, isLoading: contextLoading } = useAgeVerification();
	const [showMinorMessage, setShowMinorMessage] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		// Skip age verification for search engine crawlers and bots
		const userAgent = navigator.userAgent.toLowerCase();
		const isBot =
			/googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebookexternalhit|twitterbot|rogerbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkshare|w3c_validator|whatsapp/i.test(
				userAgent,
			);

		if (isBot) {
			updateAgeVerification(true); // Bots get full access for SEO
			setIsLoading(false);
			return;
		}

		setIsLoading(contextLoading);
	}, [contextLoading, updateAgeVerification]);

	const handleAgeConfirmation = (isAdult: boolean) => {
		if (isAdult) {
			updateAgeVerification(true);
		} else {
			// 18歳未満の場合は自サイト内にとどめて、適切なメッセージを表示
			updateAgeVerification(false);
			setShowMinorMessage(true);

			// 3秒後にトップページに戻る
			setTimeout(() => {
				window.location.href = "/";
			}, 3000);
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suzuka-50 via-background to-minase-50">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-600" />
			</div>
		);
	}

	// 18歳未満ユーザー向けメッセージ
	if (showMinorMessage) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suzuka-50 via-background to-minase-50 p-4">
				<Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-xl">
					<CardHeader className="text-center pb-4">
						<div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
							<Shield className="h-8 w-8 text-blue-600" />
						</div>
						<CardTitle className="text-xl font-bold text-gray-900">ありがとうございます</CardTitle>
					</CardHeader>

					<CardContent className="space-y-6">
						<div className="text-center space-y-4">
							<p className="text-sm text-gray-600 leading-relaxed">
								安全なご利用のため、年齢制限のない
								<br />
								コンテンツのみご利用いただけます。
							</p>
							<div className="flex items-center justify-center gap-2 text-xs text-blue-600">
								<Heart className="h-3 w-3" />
								<span>全年齢対象のコンテンツをお楽しみください</span>
							</div>
							<div className="text-xs text-gray-400 text-center">
								3秒後にトップページに移動します...
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// 年齢確認が未完了の場合
	if (!isAgeVerified) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suzuka-50 via-background to-minase-50 p-4">
				<Card className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm shadow-xl">
					<CardHeader className="text-center pb-4">
						<div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
							<AlertTriangle className="h-8 w-8 text-amber-600" />
						</div>
						<CardTitle className="text-xl font-bold text-gray-900">年齢確認</CardTitle>
					</CardHeader>

					<CardContent className="space-y-6">
						<div className="text-center space-y-3">
							<p className="text-sm text-gray-600 leading-relaxed">
								このサイトには18歳未満の方には適さない
								<br />
								コンテンツが含まれています。
							</p>
							<div className="flex items-center justify-center gap-2 text-xs text-gray-500">
								<Calendar className="h-3 w-3" />
								<span>あなたは18歳以上ですか？</span>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<Button
								variant="outline"
								onClick={() => handleAgeConfirmation(false)}
								className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
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

						<div className="text-xs text-gray-400 text-center leading-relaxed">
							この確認は法的要件に基づくものです。
							<br />
							30日間記憶され、期限後に再確認が必要です。
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return <>{children}</>;
}
