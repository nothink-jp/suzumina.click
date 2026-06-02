/**
 * ホームページのヒーローセクション。
 * PPR の静的シェルに含めるため、データ取得を持たない純粋なサーバーコンポーネント。
 */
export function HeroSection() {
	return (
		<section className="py-12 sm:py-16 md:py-20 text-center bg-suzuka-50 critical-above-fold critical-hero">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="max-w-4xl mx-auto">
					<h1
						className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6"
						style={{
							minHeight: "2.5rem",
							contentVisibility: "visible",
						}}
					>
						すずみなくりっく！
					</h1>
					<p
						className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 px-4 sm:px-0"
						style={{
							minHeight: "3rem",
						}}
					>
						涼花みなせさんのYouTube動画から、好きな場面を再生できるボタンを作ろう！
						<br />
						あーたたちが集まる、あーたたちのためのファンサイトです
					</p>
				</div>
			</div>
		</section>
	);
}
