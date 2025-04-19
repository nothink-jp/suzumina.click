// functions/src/firebaseAdmin.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as admin from "firebase-admin";

// Define mocks outside describe block
const mockInitializeApp = vi.fn();
const mockFirestoreCollection = vi.fn();
const mockFirestoreBatch = vi.fn();
const mockFirestoreInstance = {
  collection: mockFirestoreCollection,
  batch: mockFirestoreBatch,
};
const mockAdminFirestore = vi.fn(() => mockFirestoreInstance);

vi.mock("firebase-admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase-admin")>();
  return {
    ...actual,
    initializeApp: mockInitializeApp,
    firestore: mockAdminFirestore,
  };
});

describe("firebaseAdmin", () => {
  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Reset modules to ensure clean state for each test, especially for module-level initialization
    vi.resetModules();
  });

  it("should initialize Firebase Admin SDK only once when initializeFirebaseAdmin is called multiple times", async () => {
    // Arrange: Import *after* resetting modules, add .js extension
    const { initializeFirebaseAdmin } = await import("./firebaseAdmin.js");
    // Mock clear might be redundant due to resetModules, but doesn't hurt
    mockInitializeApp.mockClear();

    // Act
    initializeFirebaseAdmin();
    initializeFirebaseAdmin();
    initializeFirebaseAdmin();

    // Assert
    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
  });

  it("should export a defined firestore instance and call admin.firestore on module load", async () => {
    // Arrange: Import *after* resetting modules, add .js extension
    const { firestore } = await import("./firebaseAdmin.js");

    // Assert
    expect(firestore).toBeDefined();
    expect(firestore).toBe(mockFirestoreInstance);
    // Check if admin.firestore was called (at least once due to module import)
    expect(mockAdminFirestore).toHaveBeenCalled();
    // If you need to ensure it's called *exactly* once during the import:
    // expect(mockAdminFirestore).toHaveBeenCalledTimes(1); // This might be fragile
  });
});
