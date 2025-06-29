"use client";

import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";

/**
 * Client-side auth functions that don't require Firestore
 * These are safe to use in client components
 */

export function signIn(provider: string, options?: { redirectTo?: string }) {
	return nextAuthSignIn(provider, options);
}

export function signOut() {
	return nextAuthSignOut();
}
