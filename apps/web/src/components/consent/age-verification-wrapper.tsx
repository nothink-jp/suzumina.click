import { Suspense } from "react";
import { isSearchEngineBot } from "@/lib/seo/bot-detection";
import { AgeVerificationGate } from "./age-verification-gate";

interface AgeVerificationWrapperProps {
	children: React.ReactNode;
}

/**
 * Server Component wrapper that conditionally applies age verification
 * Automatically bypasses age verification for search engine crawlers
 */
export async function AgeVerificationWrapper({ children }: AgeVerificationWrapperProps) {
	// Check if request is from a search engine bot
	const isBot = await isSearchEngineBot();

	// For bots, render content directly without age verification
	if (isBot) {
		return <>{children}</>;
	}

	// For regular users, apply age verification
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suzuka-50 via-background to-minase-50">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-600" />
				</div>
			}
		>
			<AgeVerificationGate>{children}</AgeVerificationGate>
		</Suspense>
	);
}
