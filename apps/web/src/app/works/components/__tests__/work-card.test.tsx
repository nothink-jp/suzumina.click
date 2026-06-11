import type { WorkPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WorkCard, { formatDate } from "../work-card";

// next/link は素の <a> に置換（href 検証を容易にする）
vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// WorkCard が参照するフィールドのみを満たす最小 fixture（不要フィールドは cast で省略）
const createWork = (overrides: Partial<WorkPlainObject> = {}): WorkPlainObject =>
	({
		id: "RJ123456",
		title: "テスト作品",
		circle: "テストサークル",
		circleId: "RG12345",
		workUrl: "https://www.dlsite.com/work/RJ123456",
		thumbnailUrl: "thumb.jpg",
		highResImageUrl: "high.jpg",
		releaseDate: "2023年5月6日",
		genres: ["ボイス・ASMR", "癒し"],
		price: {
			current: 1100,
			original: 2200,
			currency: "JPY",
			discount: 50,
			isFree: false,
			isDiscounted: true,
			formattedPrice: "¥1,100",
		},
		creators: {
			voiceActors: [{ id: "CR001", name: "声優A" }],
			scenario: [],
			illustration: [],
			music: [],
			others: [],
			voiceActorNames: ["声優A"],
			scenarioNames: [],
			illustrationNames: [],
			musicNames: [],
			otherNames: [],
		},
		...overrides,
	}) as WorkPlainObject;

describe("formatDate", () => {
	it('"YYYY年M月D日" を 0 埋め付き "YYYY/MM/DD" に整形する', () => {
		expect(formatDate("2023年5月6日")).toBe("2023/05/06");
	});

	it('"YYYY/M/D" を 0 埋め付き "YYYY/MM/DD" に整形する', () => {
		expect(formatDate("2023/5/6")).toBe("2023/05/06");
		// 後続文字列があっても日付部分のみ取り出す
		expect(formatDate("2023/12/25 ほか")).toBe("2023/12/25");
	});

	it("ISO/日時文字列は JST 暦日に整形する（TZ 非依存）", () => {
		// UTC 16:00 は JST では翌日 01:00 → 同日扱いにならず JST の暦日になる
		expect(formatDate("2023-05-06T00:00:00Z")).toBe("2023/05/06");
	});

	it("パースできない文字列はそのまま返す", () => {
		expect(formatDate("不明な日付")).toBe("不明な日付");
	});
});

describe("WorkCard", () => {
	it("基本情報（タイトル・サークル・発売日）を表示する", () => {
		render(<WorkCard work={createWork()} />);
		expect(screen.getByText("テスト作品")).toBeInTheDocument();
		expect(screen.getByText("テストサークル")).toBeInTheDocument();
		// 発売日は formatDate 経由で整形される
		expect(screen.getByText("2023/05/06")).toBeInTheDocument();
	});

	it("セール中は割引価格・元価格・OFF バッジ・セール中バッジを表示する", () => {
		render(<WorkCard work={createWork()} />);
		expect(screen.getByText("¥1,100")).toBeInTheDocument();
		expect(screen.getByText("¥2,200")).toBeInTheDocument();
		expect(screen.getByText("50% OFF")).toBeInTheDocument();
		expect(screen.getByText("セール中")).toBeInTheDocument();
	});

	it("OFF 率は current/original から算出し、stale な price.discount は使わない（SPR-187）", () => {
		// discount フィールドは古い 99 を持つが、表示は current/original 由来の 50% になる
		const work = createWork({
			price: {
				current: 1100,
				original: 2200,
				currency: "JPY",
				discount: 99,
				isFree: false,
				isDiscounted: true,
				formattedPrice: "¥1,100",
			},
		});
		render(<WorkCard work={work} />);
		expect(screen.getByText("50% OFF")).toBeInTheDocument();
		expect(screen.queryByText("99% OFF")).not.toBeInTheDocument();
	});

	it("非セール時は単一価格を表示し、セール中バッジ・OFF を出さない", () => {
		const work = createWork({
			price: {
				current: 2200,
				original: 2200,
				currency: "JPY",
				isFree: false,
				isDiscounted: false,
				formattedPrice: "¥2,200",
			},
		});
		render(<WorkCard work={work} />);
		expect(screen.getByText("¥2,200")).toBeInTheDocument();
		expect(screen.queryByText("セール中")).not.toBeInTheDocument();
		expect(screen.queryByText(/% OFF/)).not.toBeInTheDocument();
	});

	it("compact variant では価格ブロックを表示せず、詳細ボタンが「詳細を見る」表記になる", () => {
		render(<WorkCard work={createWork()} variant="compact" />);
		// 価格は非表示
		expect(screen.queryByText("¥1,100")).not.toBeInTheDocument();
		// compact では詳細ボタンが「詳細を見る」（default は「詳細」）
		expect(screen.getByRole("link", { name: "詳細を見る" })).toBeInTheDocument();
	});

	it("default variant では詳細ボタンが「詳細」表記になる", () => {
		render(<WorkCard work={createWork()} />);
		expect(screen.getByRole("link", { name: "詳細" })).toBeInTheDocument();
	});

	it("circleId があるとサークルリンクを張る", () => {
		render(<WorkCard work={createWork()} />);
		const circleLink = screen.getByText("テストサークル").closest("a");
		expect(circleLink).toHaveAttribute("href", "/circles/RG12345");
	});

	it("circleId が無いとサークル名はリンクにせず段落表示する", () => {
		render(<WorkCard work={createWork({ circleId: undefined })} />);
		const circle = screen.getByText("テストサークル");
		expect(circle.closest("a")).toBeNull();
		expect(circle.tagName).toBe("P");
	});

	it("ジャンルを最大 3 件まで表示する", () => {
		const work = createWork({ genres: ["g1", "g2", "g3", "g4"] });
		render(<WorkCard work={work} />);
		expect(screen.getByText("g1")).toBeInTheDocument();
		expect(screen.getByText("g3")).toBeInTheDocument();
		expect(screen.queryByText("g4")).not.toBeInTheDocument();
	});

	it("genres が配列でない場合はジャンルを表示しない", () => {
		const work = createWork({ genres: undefined as unknown as string[] });
		render(<WorkCard work={work} />);
		// クラッシュせず描画でき、タイトルは出る
		expect(screen.getByText("テスト作品")).toBeInTheDocument();
	});

	it("releaseDate が無いと発売日は「不明」と表示する", () => {
		render(<WorkCard work={createWork({ releaseDate: undefined })} />);
		expect(screen.getByText("不明")).toBeInTheDocument();
	});

	it("声優を最大 2 名表示し、3 名以上で「他」を付ける", () => {
		const work = createWork({
			creators: {
				...createWork().creators,
				voiceActors: [
					{ id: "a", name: "声優A" },
					{ id: "b", name: "声優B" },
					{ id: "c", name: "声優C" },
				],
			},
		});
		render(<WorkCard work={work} />);
		expect(screen.getByText("声優A")).toBeInTheDocument();
		expect(screen.getByText("声優B")).toBeInTheDocument();
		expect(screen.queryByText("声優C")).not.toBeInTheDocument();
		expect(screen.getByText(/他/)).toBeInTheDocument();
		// id があれば creators リンクは id を使う
		expect(screen.getByText("声優A").closest("a")).toHaveAttribute("href", "/creators/a");
	});

	it("声優が空配列なら CV 表示を出さない", () => {
		const work = createWork({
			creators: { ...createWork().creators, voiceActors: [] },
		});
		render(<WorkCard work={work} />);
		expect(screen.queryByText("CV:")).not.toBeInTheDocument();
	});

	it("声優に id が無い場合は name を creators リンクに使う", () => {
		const work = createWork({
			creators: {
				...createWork().creators,
				voiceActors: [{ name: "名前のみ声優" }],
			},
		});
		render(<WorkCard work={work} />);
		expect(screen.getByText("名前のみ声優").closest("a")).toHaveAttribute(
			"href",
			"/creators/%E5%90%8D%E5%89%8D%E3%81%AE%E3%81%BF%E5%A3%B0%E5%84%AA",
		);
	});

	it("priority=true でサムネイルが eager 読み込みになる", () => {
		render(<WorkCard work={createWork()} priority />);
		const img = screen.getByAltText("テスト作品のサムネイル画像");
		expect(img).toHaveAttribute("loading", "eager");
	});

	it("priority 未指定（default false）でサムネイルが lazy 読み込みになる", () => {
		render(<WorkCard work={createWork()} />);
		const img = screen.getByAltText("テスト作品のサムネイル画像");
		expect(img).toHaveAttribute("loading", "lazy");
	});

	it("price が無い場合は ¥0 表示にフォールバックしセール表示を出さない", () => {
		const work = createWork({ price: undefined as unknown as WorkPlainObject["price"] });
		render(<WorkCard work={work} />);
		expect(screen.getByText("¥0")).toBeInTheDocument();
		expect(screen.queryByText("セール中")).not.toBeInTheDocument();
	});

	it("highResImageUrl が無いと thumbnailUrl をサムネイルに使う", () => {
		render(<WorkCard work={createWork({ highResImageUrl: undefined })} />);
		const img = screen.getByAltText("テスト作品のサムネイル画像");
		expect(img).toHaveAttribute("src", "thumb.jpg");
	});

	it("highResImageUrl も thumbnailUrl も無いと placeholder にフォールバックする", () => {
		render(<WorkCard work={createWork({ highResImageUrl: undefined, thumbnailUrl: undefined })} />);
		const img = screen.getByAltText("テスト作品のサムネイル画像");
		expect(img).toHaveAttribute("src", "/placeholder.svg");
	});

	it("creators が無くてもクラッシュせず CV 表示を出さない", () => {
		const work = createWork({
			creators: undefined as unknown as WorkPlainObject["creators"],
		});
		render(<WorkCard work={work} />);
		expect(screen.getByText("テスト作品")).toBeInTheDocument();
		expect(screen.queryByText("CV:")).not.toBeInTheDocument();
	});

	it("DLsite 購入リンクを workUrl で別タブに張る", () => {
		render(<WorkCard work={createWork()} />);
		const buyLink = screen.getByLabelText("テスト作品をDLsiteで購入");
		expect(buyLink).toHaveAttribute("href", "https://www.dlsite.com/work/RJ123456");
		expect(buyLink).toHaveAttribute("target", "_blank");
	});
});
