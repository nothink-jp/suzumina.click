import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateUserTagsAction } from "@/actions/user-tags";
import { useSession } from "@/lib/auth/client";
import { buildTagSearchHref } from "@/lib/tag-search";
import { VideoUserTagEditor } from "../video-user-tag-editor";

vi.mock("@/lib/auth/client", () => ({
	useSession: vi.fn(),
}));

vi.mock("@/actions/user-tags", () => ({
	updateUserTagsAction: vi.fn(),
}));

// router.push / router.refresh の副作用を検証するため next/navigation をローカルでモックして捕捉する
// （vitest.setup.ts のグローバルモックは毎回新しい vi.fn を返し捕捉できないため）。
const { mockPush, mockRefresh } = vi.hoisted(() => ({
	mockPush: vi.fn(),
	mockRefresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// 子コンポーネントは本体ロジックの検証外なのでスタブ化する。
// onTagClick / onUpdateTags のコールバックを発火できるようにしておく。
vi.mock("@suzumina.click/ui/components/custom/three-layer-tag-display", () => ({
	ThreeLayerTagDisplay: ({
		onTagClick,
	}: {
		onTagClick: (tag: string, layer: "playlist" | "user" | "category") => void;
	}) => (
		<button type="button" onClick={() => onTagClick("ASMR", "user")}>
			tag-display
		</button>
	),
}));

// onUpdateTags の戻り値を捕捉する（handleUpdateTags の分岐検証用）
const { updateResult } = vi.hoisted(() => ({
	updateResult: { value: null as unknown },
}));

vi.mock("@/components/video/video-tag-editor", () => ({
	VideoTagEditor: ({
		videoId,
		onUpdateTags,
	}: {
		videoId: string;
		onUpdateTags: (videoId: string, tags: string[]) => Promise<unknown>;
	}) => (
		<button
			type="button"
			onClick={async () => {
				updateResult.value = await onUpdateTags(videoId, ["new-tag"]);
			}}
		>
			保存
		</button>
	),
}));

const loggedIn = { data: { user: { discordId: "123" } } };
const loggedOut = { data: null };

const createVideo = (): VideoPlainObject =>
	({
		videoId: "abc123",
		categoryId: "10",
		tags: {
			playlistTags: ["プレイリスト"],
			userTags: ["みんな"],
		},
	}) as unknown as VideoPlainObject;

// tags / categoryId 未設定（`?.` と `|| []` / `categoryName || undefined` のフォールバック検証用）
const createVideoWithoutTags = (): VideoPlainObject =>
	({
		videoId: "abc123",
	}) as unknown as VideoPlainObject;

describe("VideoUserTagEditor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		updateResult.value = null;
	});

	it("未ログイン時は編集セクションを出さずログイン誘導を表示する", () => {
		(useSession as any).mockReturnValue(loggedOut);
		render(<VideoUserTagEditor video={createVideo()} />);

		expect(screen.getByText(/ログインしてください/)).toBeInTheDocument();
		expect(screen.queryByText("みんなのタグ編集")).not.toBeInTheDocument();
	});

	it("ログイン時は編集セクションと編集ボタンを表示する", () => {
		(useSession as any).mockReturnValue(loggedIn);
		render(<VideoUserTagEditor video={createVideo()} />);

		expect(screen.getByText("みんなのタグ編集")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /編集/ })).toBeInTheDocument();
		// ログイン時は誘導文を出さない
		expect(screen.queryByText(/ログインしてください/)).not.toBeInTheDocument();
	});

	it("編集ボタンでエディタを開き、保存成功でエディタを閉じる", async () => {
		(useSession as any).mockReturnValue(loggedIn);
		(updateUserTagsAction as any).mockResolvedValue({ success: true });
		render(<VideoUserTagEditor video={createVideo()} />);

		fireEvent.click(screen.getByRole("button", { name: /編集/ }));
		// エディタ（スタブの保存ボタン）が出る
		const saveButton = screen.getByRole("button", { name: "保存" });
		fireEvent.click(saveButton);

		await waitFor(() => {
			expect(updateResult.value).toEqual({ success: true });
		});
		// 成功時はエディタが閉じ、再び編集ボタンが見える
		await waitFor(() => {
			expect(screen.queryByRole("button", { name: "保存" })).not.toBeInTheDocument();
		});
		expect(updateUserTagsAction).toHaveBeenCalledWith({
			videoId: "abc123",
			userTags: ["new-tag"],
		});
		// 成功時は最新データ取得のためページをリフレッシュする
		expect(mockRefresh).toHaveBeenCalledTimes(1);
	});

	it("保存失敗（error あり）はそのエラーメッセージを返す", async () => {
		(useSession as any).mockReturnValue(loggedIn);
		(updateUserTagsAction as any).mockResolvedValue({ success: false, error: "権限がありません" });
		render(<VideoUserTagEditor video={createVideo()} />);

		fireEvent.click(screen.getByRole("button", { name: /編集/ }));
		fireEvent.click(screen.getByRole("button", { name: "保存" }));

		await waitFor(() => {
			expect(updateResult.value).toEqual({ success: false, error: "権限がありません" });
		});
	});

	it("保存失敗（error なし）は既定メッセージを返す", async () => {
		(useSession as any).mockReturnValue(loggedIn);
		(updateUserTagsAction as any).mockResolvedValue({ success: false });
		render(<VideoUserTagEditor video={createVideo()} />);

		fireEvent.click(screen.getByRole("button", { name: /編集/ }));
		fireEvent.click(screen.getByRole("button", { name: "保存" }));

		await waitFor(() => {
			expect(updateResult.value).toEqual({
				success: false,
				error: "タグの更新に失敗しました",
			});
		});
	});

	it("アクションが Error を throw した場合はその message を返す", async () => {
		(useSession as any).mockReturnValue(loggedIn);
		(updateUserTagsAction as any).mockRejectedValue(new Error("ネットワークエラー"));
		render(<VideoUserTagEditor video={createVideo()} />);

		fireEvent.click(screen.getByRole("button", { name: /編集/ }));
		fireEvent.click(screen.getByRole("button", { name: "保存" }));

		await waitFor(() => {
			expect(updateResult.value).toEqual({ success: false, error: "ネットワークエラー" });
		});
	});

	it("アクションが Error 以外を throw した場合は既定メッセージを返す", async () => {
		(useSession as any).mockReturnValue(loggedIn);
		(updateUserTagsAction as any).mockRejectedValue("文字列エラー");
		render(<VideoUserTagEditor video={createVideo()} />);

		fireEvent.click(screen.getByRole("button", { name: /編集/ }));
		fireEvent.click(screen.getByRole("button", { name: "保存" }));

		await waitFor(() => {
			expect(updateResult.value).toEqual({
				success: false,
				error: "タグの更新に失敗しました",
			});
		});
	});

	it("tags / categoryId が無くてもフォールバックして描画できる", () => {
		(useSession as any).mockReturnValue(loggedOut);
		expect(() => render(<VideoUserTagEditor video={createVideoWithoutTags()} />)).not.toThrow();
		expect(screen.getByText("tag-display")).toBeInTheDocument();
	});

	it("tags が無い状態でも編集エディタを開ける（プロップのフォールバック）", () => {
		(useSession as any).mockReturnValue(loggedIn);
		render(<VideoUserTagEditor video={createVideoWithoutTags()} />);

		fireEvent.click(screen.getByRole("button", { name: /編集/ }));
		expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
	});

	it("タグクリックで buildTagSearchHref の URL に router.push する", () => {
		(useSession as any).mockReturnValue(loggedIn);
		render(<VideoUserTagEditor video={createVideo()} />);

		// ThreeLayerTagDisplay スタブが onTagClick("ASMR", "user") を発火する
		fireEvent.click(screen.getByText("tag-display"));

		expect(mockPush).toHaveBeenCalledWith(buildTagSearchHref("ASMR", "user"));
	});
});
