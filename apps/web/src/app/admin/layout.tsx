import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Check if user is authenticated and has admin role
  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex h-16 items-center space-x-8">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">管理画面</h1>
            </div>
            <div className="flex space-x-4">
              <a
                href="/admin/users"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                ユーザー管理
              </a>
              <a
                href="/admin/videos"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                動画管理
              </a>
              <a
                href="/admin/works"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                作品管理
              </a>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
