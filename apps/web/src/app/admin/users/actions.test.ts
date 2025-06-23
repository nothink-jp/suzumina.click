import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserStats } from "./actions";

// Mock dependencies
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/firestore", () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn(() => ({
      get: vi.fn(),
      where: vi.fn(() => ({
        get: vi.fn(),
      })),
    })),
  })),
}));

describe("Admin User Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserStats", () => {
    it("should require admin authentication", async () => {
      const { auth } = await import("@/auth");

      // Mock no session
      vi.mocked(auth).mockResolvedValue(null);

      await expect(getUserStats()).rejects.toThrow();
    });

    it("should require admin role", async () => {
      const { auth } = await import("@/auth");

      // Mock session without admin role
      vi.mocked(auth).mockResolvedValue({
        user: {
          discordId: "123",
          username: "test",
          displayName: "Test User",
          role: "member",
          guildMembership: {
            guildId: "959095494456537158",
            userId: "123",
            isMember: true,
          },
          isActive: true,
        },
      });

      await expect(getUserStats()).rejects.toThrow();
    });

    it("should return user statistics for admin", async () => {
      const { auth } = await import("@/auth");
      const { getFirestore } = await import("@/lib/firestore");

      // Mock admin session
      vi.mocked(auth).mockResolvedValue({
        user: {
          discordId: "123",
          username: "admin",
          displayName: "Admin User",
          role: "admin",
          guildMembership: {
            guildId: "959095494456537158",
            userId: "123",
            isMember: true,
          },
          isActive: true,
        },
      });

      // Mock Firestore responses
      const mockSnapshot = { size: 10 };
      const mockCollection = {
        get: vi.fn().mockResolvedValue(mockSnapshot),
        where: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ size: 5 }),
        })),
      };

      vi.mocked(getFirestore).mockReturnValue({
        collection: vi.fn().mockReturnValue(mockCollection),
      } as any);

      const stats = await getUserStats();

      expect(stats).toEqual({
        totalUsers: 10,
        activeUsers: 5,
        adminUsers: 5,
        moderatorUsers: 5,
      });
    });
  });
});
