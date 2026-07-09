"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getUserHomePath } from "@/lib/auth-routing";
import { apiUrl } from "@/lib/api-base";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(apiUrl("/api/accounts/token/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Login failed");
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);

      const userRes = await fetch(apiUrl("/api/accounts/me/"), {
        headers: { Authorization: `Bearer ${data.access}` },
      });

      if (!userRes.ok) {
        throw new Error("Failed to load user profile");
      }

      const user = await userRes.json();
      router.push(getUserHomePath(user));
    } catch {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7fbfd]">
      <div className="pointer-events-none absolute inset-y-0 right-[6vw] hidden w-[62vw] lg:block">
        <Image
          src="/login-erp-hero.png"
          alt=""
          fill
          priority
          sizes="62vw"
          className="object-contain object-right-center opacity-85 contrast-110 saturate-150"
        />
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-[6vw] hidden w-[58vw] bg-gradient-to-r from-[#f7fbfd] via-[#f7fbfd]/35 to-transparent lg:block" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[45%_55%] lg:px-10">
        <section className="flex justify-center lg:justify-start lg:pl-10 xl:pl-16">
          <div className="w-full max-w-[480px] rounded-2xl border border-[#d8e3ec] bg-white/95 p-8 shadow-[0_24px_70px_rgba(28,43,69,0.14)] backdrop-blur sm:p-10">
            <div className="mb-6 border-b border-[#e3ebf2] pb-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#0f9f94]">
              ERP System
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#1f2f50]">Sign in</h1>
            <p className="mt-1 text-sm text-[#5d6b7f]">
              Access sales, inventory, procurement, and production.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#34445c]">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 w-full rounded-lg border border-[#cfd9e5] bg-[#f8fbfd] px-4 text-[#1f2f50] outline-none transition focus:border-[#0f9f94] focus:bg-white focus:ring-2 focus:ring-[#9ee7df]/50"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#34445c]">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 w-full rounded-lg border border-[#cfd9e5] bg-[#f8fbfd] px-4 text-[#1f2f50] outline-none transition focus:border-[#0f9f94] focus:bg-white focus:ring-2 focus:ring-[#9ee7df]/50"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-lg bg-[#1f2f50] px-5 font-semibold text-white shadow-sm transition hover:bg-[#162640] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {error && (
              <p className="text-sm font-medium text-red-600">{error}</p>
            )}
          </form>
          </div>
        </section>

        <section className="hidden lg:block" aria-hidden="true" />
      </div>
    </main>
  );
}
