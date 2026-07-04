"use client";

import { DockedPanel } from "@suzumina.click/ui/components/custom";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Check, Shield, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAgeVerification } from "@/contexts/age-verification-context";

// lib/seo/bot-detection.ts に以前あったサーバー側リストと同じもの。
// 検索エンジン/監視サービスのクローラーがこのカードを回避し続けるようにする。
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

// Cookie バー（cookie-consent-banner.tsx）と同じ基準。狭い画面ではモバイル用の
// 全幅ボトムシート挙動に切り替える判定に使う（トースト終了後は表示設定ピルを
// 出さず hidden にすることで、Cookie バーの全幅シートと重ならないようにする）。
const NARROW_VIEWPORT_QUERY = "(max-width: 639px)";

/**
 * 非モーダルで角にドッキングする年齢ゲート（案A: ドッキングカード）。
 * ページは最初の描画からブラウズ・スクロール可能で、backdrop も表示せず
 * リダイレクトもしない。「全年齢のみで続ける」を選んでも、そのページで
 * R18コンテンツを絞り込んだまま閲覧を継続できる。デスクトップ幅では
 * 選択後に常駐の「表示設定」ピルからいつでも再度開けるが、狭い画面では
 * Cookie バー（同じ全幅ボトムシート領域を使う）と重ならないようピルを
 * 出さずに閉じる。
 */
export function AgeVerificationOverlay() {
	const { isAgeVerified, isLoading, updateAgeVerification, setAgeCardDocked } =
		useAgeVerification();
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

	// ask/toast/pill の流れは、このコンポーネントが mount した時点で未確認だった
	// 訪問者だけに出す。確認済みで再訪した場合はここでは何も表示しない
	// （/settings や、明示的に再度開いた場合のこのカード自体からいつでも変更可能）。
	useEffect(() => {
		if (isLoading || !botChecked || initializedRef.current) return;
		initializedRef.current = true;
		setStage(isAgeVerified ? "hidden" : "ask");
	}, [isLoading, botChecked, isAgeVerified]);

	// ask/toast の間は Cookie バー等の他のドックUIと重ならないよう、ドック占有中
	// であることを共有シグナルとして公開する（pill/hidden は非占有として扱う。
	// pill はモバイルでは出さない設計にしたうえで、常にコンパクトな表示に留める）。
	useEffect(() => {
		setAgeCardDocked(stage === "ask" || stage === "toast");
	}, [stage, setAgeCardDocked]);

	const handleChoice = (isAdult: boolean) => {
		updateAgeVerification(isAdult);
		setChosenAdult(isAdult);
		setStage("toast");
	};

	const closeToast = () => {
		// 狭い画面では Cookie バーが全幅ボトムシートになるため、表示設定ピルは
		// 出さずに閉じる（ピルも全幅化すると Cookie バーと重なってしまうため）。
		const isNarrowViewport = window.matchMedia(NARROW_VIEWPORT_QUERY).matches;
		setStage(isNarrowViewport ? "hidden" : "pill");
	};

	if (stage === "hidden") return null;

	if (stage === "pill") {
		return (
			<DockedPanel
				position="bottom-right"
				variant="pill"
				mobileSheet={false}
				aria-label="表示設定を開く"
			>
				<button
					type="button"
					onClick={() => setStage("ask")}
					className="flex items-center gap-2 px-3.5 py-2 text-xs text-foreground"
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
					onClick={closeToast}
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
				選択は30日間このブラウザに記憶されます。設定ページからいつでも変更できます。
			</p>
		</DockedPanel>
	);
}
