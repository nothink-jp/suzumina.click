import type { WorkPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreatorBadges, CreatorList } from "../work-creators";

vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

const creators = {
	voiceActors: [{ id: "VA1", name: "声優A" }, { name: "声優B" }],
	scenario: [{ id: "SC1", name: "脚本A" }],
	illustration: [],
	music: [],
	others: [{ name: "その他A" }],
	voiceActorNames: [],
	scenarioNames: [],
	illustrationNames: [],
	musicNames: [],
	otherNames: [],
} as unknown as WorkPlainObject["creators"];

describe("CreatorBadges（詳細タブの制作陣）", () => {
	it("声優のみ creator リンク付き、id 無し声優・他職種はリンクなし（従来挙動）", () => {
		render(<CreatorBadges creators={creators} />);
		expect(screen.getByText("声優A").closest("a")).toHaveAttribute("href", "/creators/VA1");
		expect(screen.getByText("声優B").closest("a")).toBeNull();
		// シナリオは id があってもリンクしない
		expect(screen.getByText("脚本A").closest("a")).toBeNull();
	});

	it("空の職種は見出しを出さない", () => {
		render(<CreatorBadges creators={creators} />);
		expect(screen.getByText("声優")).toBeInTheDocument();
		expect(screen.getByText("その他")).toBeInTheDocument();
		expect(screen.queryByText("イラスト")).not.toBeInTheDocument();
		expect(screen.queryByText("音楽")).not.toBeInTheDocument();
	});
});

describe("CreatorList（サイドバー）", () => {
	it("全職種 id ありで creator リンク、id 無しはリンクなし", () => {
		render(<CreatorList creators={creators} />);
		expect(screen.getByText("声優（CV）")).toBeInTheDocument();
		expect(screen.getByText("声優A").closest("a")).toHaveAttribute("href", "/creators/VA1");
		expect(screen.getByText("声優B").closest("a")).toBeNull();
	});

	it("creators が undefined でもクラッシュしない", () => {
		const { container } = render(<CreatorList creators={undefined} />);
		expect(container).toBeTruthy();
	});
});
