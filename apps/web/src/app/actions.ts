"use server";

import { auth, signOut } from "@/auth";

export async function signOutAction() {
  await signOut();
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user;
}