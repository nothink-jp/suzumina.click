"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSignIn = async () => {
    try {
      await signIn("discord", {
        callbackUrl,
      });
    } catch (error) {
      console.error("Failed to sign in:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            すずみなふぁみりー
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Discordアカウントでログインしてください
          </p>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            Discordでログイン
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            ログインには「すずみなふぁみりー」Discordサーバーのメンバーである必要があります
          </p>
        </div>
      </div>
    </div>
  );
}
