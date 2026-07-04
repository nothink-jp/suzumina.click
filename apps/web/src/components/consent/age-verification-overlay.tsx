"use client";

import { DockedPanel } from "@suzumina.click/ui/components/custom";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Check, Shield, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAgeVerification } from "@/contexts/age-verification-context";

// Match the server-side list that previously lived in lib/seo/bot-detection.ts
// so SEO crawlers and uptime monitors keep bypassing the overlay.
const BOT_USER_AGENTS = [
	// Search engines
	"googlebot",
	"bingbot",
	"slurp",
	"duckduckbot",
	"baiduspider",
	"yandexbot",
	"sogou",
	"exabot",
	"facebot",
	"applebot",
	"seznambot",
	"yisoubot",
	// Social media crawlers
	"facebookexternalhit",
	"twitterbot",
	"linkedinbot",
	"pinterest",
	"slackbot",
	"telegrambot",
	"whatsapp",
	"discordbot",
	"vkshare",
	// SEO tools
	"rogerbot",
	"semrushbot",
	"ahrefsbot",
	"mj12bot",
	"dotbot",
	// Other crawlers
	"embedly",
	"quora link preview",
	"showyoubot",
	"outbrain",
	"w3c_validator",
	// Monitoring services
	"uptimerobot",
	"pingdom",
	"statuscake",
	"site24x7",
];
const BOT_UA_PATTERN = new RegExp(BOT_USER_AGENTS.join("|"), "i");

type Stage = "hidden" | "ask" | "toast" | "pill";

/**
 * Non-modal, corner-docked age gate (案A: ドッキングカード). The page is
 * browsable and scrollable from first paint — this never renders a backdrop
 * and never redirects. Choosing "全年齢のみで続ける" just keeps R18 content
 * filtered on the current page; the visitor can reopen the card anytime via
 * the persistent "表示設定" pill.
 */
export function AgeVerificationOverlay() {
	const { isAgeVerified, isLoading, updateAgeVerification } = useAgeVerification();
	const [botChecked, setBotChecked] = useState(false);
	const [stage, setStage] = useState<Stage>("hidden");
	const [chosenAdult, setChosenAdult] = useState(false);
	const initializedRef = useRef(false);

	useEffect(() => {
		if (BOT_UA_PATTERN.test(navigator.userAgent)) {
			updateAgeVerification(true);
		}
		setBotChecked(true);
	}, [updateAgeVerification]);

	// Only drive the ask/toast/pill flow for a visitor who is unverified when this
	// component mounts. A returning, already-verified visitor sees nothing here —
	// they can still change their mode anytime via /settings or this same card
	// once they explicitly reopen it (there's nothing to reopen from on a fresh
	// page load, so no persistent site-wide pill is shown across sessions).
	useEffect(() => {
		if (isLoading || !botChecked || initializedRef.current) return;
		initializedRef.current = true;
		setStage(isAgeVerified ? "hidden" : "ask");
	}, [isLoading, botChecked, isAgeVerified]);

	const handleChoice = (isAdult: boolean) => {
		updateAgeVerification(isAdult);
		setChosenAdult(isAdult);
		setStage("toast");
	};

	if (stage === "hidden") return null;

	if (stage === "pill") {
		return (
			<DockedPanel position="bottom-right" variant="pill" aria-label="表示設定を開く">
				<button
					type="button"
					onClick={() => setStage("ask")}
					className="flex w-full items-center gap-2 px-4 py-2.5 text-xs text-foreground sm:px-3.5 sm:py-2"
				>
					<Shield className="h-3.5 w-3.5 text-primary" />
					表示設定
				</button>
			</DockedPanel>
		);
	}

	if (stage === "toast") {
		return (
			<DockedPanel
				role="status"
				position="bottom-right"
				aria-label="表示モードの確認"
				className="flex max-w-full items-center gap-3 p-3.5 sm:max-w-[400px]"
			>
				<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
					<Check className="h-4 w-4" />
				</div>
				<span className="text-sm text-foreground">
					{chosenAdult ? "R18作品を含むすべての作品を表示します" : "全年齢対象の作品のみ表示します"}
				</span>
				<button
					type="button"
					onClick={() => setStage("ask")}
					className="whitespace-nowrap text-xs text-primary underline"
				>
					変更
				</button>
				<button
					type="button"
					onClick={() => setStage("pill")}
					aria-label="閉じる"
					className="text-muted-foreground hover:text-foreground"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			</DockedPanel>
		);
	}

	return (
		<DockedPanel
			position="bottom-right"
			aria-label="表示モードの確認"
			className="flex w-full flex-col gap-3 p-5 sm:max-w-[360px]"
		>
			<div className="flex items-center gap-2">
				<Badge variant="destructive">R18</Badge>
				<h3 className="text-sm font-bold text-foreground">表示モードの確認</h3>
			</div>
			<p className="text-xs leading-relaxed text-muted-foreground">
				このサイトはDLsite作品情報など、18歳未満の方に適さないコンテンツを含みます。現在は
				<strong className="text-foreground">全年齢作品のみ</strong>表示しています。
			</p>
			<div className="flex flex-col gap-2">
				<Button onClick={() => handleChoice(true)} className="w-full">
					18歳以上 — すべての作品を表示
				</Button>
				<Button variant="outline" onClick={() => handleChoice(false)} className="w-full">
					全年齢のみで続ける
				</Button>
			</div>
			<p className="text-[11px] leading-relaxed text-muted-foreground">
				選択は30日間このブラウザに記憶されます。右下の「表示設定」からいつでも変更できます。
			</p>
		</DockedPanel>
	);
}
