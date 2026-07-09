"use client";

import Link from "next/link";
import { apiUrl } from "@/lib/api-base";

import { useEffect, useState } from "react";


type CurrentUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  department: string;
};

function formatValue(value: string) {
  return value
    ? value
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Not assigned";
}

export default function ProfilePage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("Please sign in to view your profile.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(apiUrl("/api/accounts/me/"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Failed to load profile");
        }

        const data: CurrentUser = await res.json();
        setUser(data);
      } catch {
        setError("Failed to load profile information.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  return (
    <main className="min-h-[calc(100vh-73px)] bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Profile</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">
              Account Details
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Your account and employee assignment details.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-fit rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            Dashboard
          </Link>
        </div>

        {loading ? (
          <p className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
            Loading profile...
          </p>
        ) : error ? (
          <p className="rounded-lg border border-red-100 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </p>
        ) : user ? (
          <div className="space-y-6">
            <section className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-bold text-gray-950">
                  {user.username}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {formatValue(user.role)}
                </p>
              </div>
            </section>

            <div className="grid gap-5 sm:grid-cols-2">
              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <p className="text-sm font-medium text-gray-500">Name</p>
                <h3 className="mt-3 text-xl font-semibold text-gray-950">
                  {user.username}
                </h3>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <p className="text-sm font-medium text-gray-500">Email</p>
                <h3 className="mt-3 break-words text-xl font-semibold text-gray-950">
                  {user.email || "Not provided"}
                </h3>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <p className="text-sm font-medium text-gray-500">Department</p>
                <h3 className="mt-3 text-xl font-semibold text-gray-950">
                  {formatValue(user.department)}
                </h3>
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <p className="text-sm font-medium text-gray-500">Role</p>
                <h3 className="mt-3 text-xl font-semibold text-gray-950">
                  {formatValue(user.role)}
                </h3>
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
