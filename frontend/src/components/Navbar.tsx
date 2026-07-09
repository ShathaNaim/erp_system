"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api-base";

type CurrentUser = {
  username: string;
};

type NavbarProps = {
  children: React.ReactNode;
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/sales", label: "Sales" },
  { href: "/inventory", label: "Inventory" },
  { href: "/production", label: "Production" },
  { href: "/procurement", label: "Procurement" },
  { href: "/profile", label: "Profile" },
];

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/sales": "Sales",
  "/inventory": "Inventory",
  "/production": "Production",
  "/procurement": "Procurement",
  "/profile": "Profile",
};

function getPageTitle(pathname: string) {
  const match = Object.keys(pageTitles)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));

  return match ? pageTitles[match] : "ERP System";
}

export default function Navbar({ children }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [username, setUsername] = useState("");
  const isLoginPage = pathname === "/login";
  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);

  useEffect(() => {
    if (isLoginPage) return;

    async function loadUser() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setUsername("");
        return;
      }

      try {
        const res = await fetch(apiUrl("/api/accounts/me/"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setUsername("");
          return;
        }

        const user: CurrentUser = await res.json();
        setUsername(user.username);
      } catch {
        setUsername("");
      }
    }

    loadUser();
  }, [isLoginPage]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/login");
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#d8e3ec] bg-[#1f2f50] text-white lg:flex lg:flex-col">
        <Link href="/" className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <span className="flex size-10 items-center justify-center rounded-lg bg-[#0f9f94] text-sm font-bold">
            ERP
          </span>
          <span>
            <span className="block text-base font-bold">ERP System</span>
            <span className="block text-xs text-slate-300">
              Operations workspace
            </span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1 px-4 py-5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-white text-[#1f2f50] shadow-sm"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg bg-white/10 px-4 py-3 text-left text-sm font-semibold text-slate-100 transition hover:bg-white hover:text-[#1f2f50]"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="sticky top-0 z-20 border-b border-[#d8e3ec] bg-white/95 backdrop-blur">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0f9f94]">
              ERP System
            </p>
            <h1 className="text-xl font-bold text-[#1f2f50]">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-[#d8e3ec] bg-[#f8fbfd] px-3 py-2 text-sm font-semibold text-[#34445c]">
              {username || "Signed in"}
            </span>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto border-t border-[#edf2f6] px-4 py-2 text-sm sm:px-6 lg:hidden">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-lg px-3 py-2 font-semibold ${
                  isActive
                    ? "bg-[#1f2f50] text-white"
                    : "text-[#34445c] hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 rounded-lg bg-[#1f2f50] px-3 py-2 font-semibold text-white"
          >
            Logout
          </button>
        </nav>
      </div>

      {children}
    </div>
  );
}
