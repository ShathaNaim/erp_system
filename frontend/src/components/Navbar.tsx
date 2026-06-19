"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getAuthSnapshot() {
  return Boolean(localStorage.getItem("access_token"));
}

function getServerAuthSnapshot() {
  return false;
}

export default function Navbar() {
  const router = useRouter();
  usePathname();
  const isLoggedIn = useSyncExternalStore(
    subscribe,
    getAuthSnapshot,
    getServerAuthSnapshot
  );

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/login");
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-gray-900">
          ERP System
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/procurement" className="text-gray-700 hover:text-gray-900">
            Procurement
          </Link>

          {isLoggedIn && (
            <Link href="/profile" className="text-gray-700 hover:text-gray-900">
              Profile
            </Link>
          )}

          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
