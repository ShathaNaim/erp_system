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
  const pathname = usePathname();
  const isLoggedIn = useSyncExternalStore(
    subscribe,
    getAuthSnapshot,
    getServerAuthSnapshot
  );
  const links = [
    { href: "/procurement", label: "Procurement" },
    { href: "/sales", label: "Sales" },
    { href: "/production", label: "Production" },
    { href: "/inventory", label: "Inventory" },
  ];

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/login");
  }

  return (
    <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
            ERP
          </span>
          <span>
            <span className="block text-base font-bold text-gray-950">
              ERP System
            </span>
            <span className="block text-xs text-gray-500">
              Operations workspace
            </span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {links.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 font-medium transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {isLoggedIn && (
            <Link
              href="/profile"
              className={`rounded-lg px-3 py-2 font-medium transition ${
                pathname.startsWith("/profile")
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-950"
              }`}
            >
              Profile
            </Link>
          )}

          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white transition hover:bg-gray-800"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
