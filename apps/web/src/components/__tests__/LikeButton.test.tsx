import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LikeButton } from "../LikeButton";

// Mock dependencies with more specific mocking to avoid NextAuth issues
vi.mock("next-auth/react", () => ({
	useSession: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock("@/actions/likes", () => ({
	getLikesStatusAction: vi.fn(),
	toggleLikeAction: vi.fn(),
}));

// Import the mocked functions after mocking
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import * as likesActions from "@/actions/likes";

const mockUseSession = vi.mocked(useSession);
const mockToast = vi.mocked(toast);
const mockGetLikesStatusAction = vi.mocked(likesActions.getLikesStatusAction);
const mockToggleLikeAction = vi.mocked(likesActions.toggleLikeAction);

describe("LikeButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders with initial like count", () => {
		mockUseSession.mockReturnValue({
			data: null,
			status: "unauthenticated",
			update: vi.fn(),
		});

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} />);

		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("disables button for unauthenticated users", () => {
		mockUseSession.mockReturnValue({
			data: null,
			status: "unauthenticated",
			update: vi.fn(),
		});

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} />);

		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("title", "いいねするにはログインが必要です");
	});

	it("fetches like status for authenticated user", async () => {
		const mockSession = {
			user: { id: "user-1", discordId: "discord-1" },
			expires: "2024-01-01",
		};

		mockUseSession.mockReturnValue({
			data: mockSession,
			status: "authenticated",
			update: vi.fn(),
		});

		const mockStatusMap = new Map([["test-id", true]]);
		mockGetLikesStatusAction.mockResolvedValue(mockStatusMap);

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} />);

		await waitFor(() => {
			expect(mockGetLikesStatusAction).toHaveBeenCalledWith(["test-id"]);
		});
	});

	it("handles successful like toggle", async () => {
		const mockSession = {
			user: { id: "user-1", discordId: "discord-1" },
			expires: "2024-01-01",
		};

		mockUseSession.mockReturnValue({
			data: mockSession,
			status: "authenticated",
			update: vi.fn(),
		});

		mockGetLikesStatusAction.mockResolvedValue(new Map([["test-id", false]]));
		mockToggleLikeAction.mockResolvedValue({
			success: true,
			isLiked: true,
		});

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} />);

		const button = screen.getByRole("button");
		fireEvent.click(button);

		await waitFor(() => {
			expect(mockToggleLikeAction).toHaveBeenCalledWith("test-id");
		});

		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith("いいねしました");
		});
	});

	it("handles failed like toggle", async () => {
		const mockSession = {
			user: { id: "user-1", discordId: "discord-1" },
			expires: "2024-01-01",
		};

		mockUseSession.mockReturnValue({
			data: mockSession,
			status: "authenticated",
			update: vi.fn(),
		});

		mockGetLikesStatusAction.mockResolvedValue(new Map([["test-id", false]]));
		mockToggleLikeAction.mockResolvedValue({
			success: false,
			error: "Network error",
		});

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} />);

		const button = screen.getByRole("button");
		fireEvent.click(button);

		await waitFor(() => {
			expect(mockToggleLikeAction).toHaveBeenCalledWith("test-id");
		});

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith("Network error");
		});
	});

	it("shows correct heart icon state", async () => {
		const mockSession = {
			user: { id: "user-1", discordId: "discord-1" },
			expires: "2024-01-01",
		};

		mockUseSession.mockReturnValue({
			data: mockSession,
			status: "authenticated",
			update: vi.fn(),
		});

		mockGetLikesStatusAction.mockResolvedValue(new Map([["test-id", true]]));

		render(<LikeButton audioButtonId="test-id" initialLikeCount={5} initialIsLiked={true} />);

		// Check if heart icon has filled state
		const heartIcon = screen.getByRole("button").querySelector("svg");
		expect(heartIcon).toHaveClass("fill-current");
	});

	it("displays like count in correct format", () => {
		mockUseSession.mockReturnValue({
			data: null,
			status: "unauthenticated",
			update: vi.fn(),
		});

		render(<LikeButton audioButtonId="test-id" initialLikeCount={1234} />);

		// Should format numbers with locale
		expect(screen.getByText("1,234")).toBeInTheDocument();
	});
});
