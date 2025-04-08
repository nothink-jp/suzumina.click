"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { UserActions } from "./UserActions";

export function Navigation() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;

  return (
    <nav className="bg-white shadow-sm max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16">
        <Link
          href="/"
          className="flex items-center px-2 py-2 text-gray-900 hover:text-gray-600"
        >
          <span className="text-lg font-medium">すずみなふぁみりー</span>
        </Link>

        <div className="flex items-center">
          <UserActions status={status} userId={userId} />
        </div>
      </div>
    </nav>
  );
}
