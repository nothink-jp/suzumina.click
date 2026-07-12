import { RabbitMark, SakuraMark } from "@suzumina.click/ui/components/custom/brand-mark";
import HomeSearch from "@/components/home/home-search";

// Claude Design 案（Home Redesign）の桜吹雪装飾。1枚花びらのパス（sakura.svg の1枚分と同形）を
// 4枚だけ手書き配置する一回限りの演出のため、共有コンポーネント化はしない。
const PETAL_PATH = "M0 -20C-62 -42 -74 -128 -46 -178L0 -150L46 -178C74 -128 62 -42 0 -20Z";
const PETALS = [
	{ style: { top: "36px", left: "6%" }, size: 34, rotate: -24, className: "text-suzuka-200" },
	{ style: { bottom: "42px", left: "30%" }, size: 24, rotate: 38, className: "text-suzuka-200" },
	{ style: { top: "28px", right: "34%" }, size: 26, rotate: 150, className: "text-suzuka-300" },
	{ style: { bottom: "70px", right: "6%" }, size: 30, rotate: -140, className: "text-suzuka-300" },
] as const;

/**
 * ホームページのヒーローセクション。
 * PPR の静的シェルに含めるため、データ取得を持たない純粋なサーバーコンポーネント。
 * 検索フォーム（HomeSearch）は client island だが動的データを読まないため静的シェルに含まれる。
 *
 * 背景の桜色（suzuka-50）はテーマ非依存の固定ブランド帯として扱う（dark: 反転させない）。
 * サイト全体はまだダークモード切替 UI を持たないため、現時点では実害はない。
 */
export function HeroSection() {
	return (
		<section className="relative overflow-hidden bg-suzuka-50 py-12 text-center critical-above-fold critical-hero sm:py-16 md:py-20 md:text-left">
			<div aria-hidden="true" className="pointer-events-none absolute inset-0">
				{PETALS.map((petal, index) => (
					<svg
						// biome-ignore lint/suspicious/noArrayIndexKey: 固定4枚の装飾で並び替えが発生しないため
						key={index}
						className={`absolute ${petal.className}`}
						style={petal.style}
						width={petal.size}
						height={petal.size}
						viewBox="-90 -190 180 180"
						fill="currentColor"
						aria-hidden="true"
					>
						<path transform={`rotate(${petal.rotate} 0 -100)`} d={PETAL_PATH} />
					</svg>
				))}
			</div>
			<div className="container relative mx-auto grid gap-10 px-4 sm:px-6 md:grid-cols-[1.15fr_0.85fr] md:items-center lg:px-8">
				<div className="mx-auto max-w-4xl md:mx-0 md:max-w-none">
					<h1
						className="mb-4 font-bold text-2xl text-foreground sm:mb-6 sm:text-3xl md:text-4xl lg:text-5xl"
						style={{
							minHeight: "2.5rem",
							contentVisibility: "visible",
						}}
					>
						すずみなくりっく！
					</h1>
					<p
						className="mb-6 px-4 text-base text-muted-foreground sm:mb-8 sm:px-0 sm:text-lg md:text-xl"
						style={{
							minHeight: "3rem",
						}}
					>
						涼花みなせさんのYouTube動画から、好きな場面を再生できるボタンを作ろう！
						<br />
						あーたたちが集まる、あーたたちのためのファンサイトです
					</p>
					<HomeSearch />
				</div>
				<div className="relative hidden min-h-[220px] items-center justify-center md:flex">
					<SakuraMark size={170} className="absolute bottom-2 left-[2%] text-suzuka-300" />
					<RabbitMark size={230} className="relative text-suzuka-400" />
				</div>
			</div>
		</section>
	);
}
