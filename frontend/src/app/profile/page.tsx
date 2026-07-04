"use client";

import Link from "next/link";
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
        const res = await fetch("http://127.0.0.1:8000/api/accounts/me/", {
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
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            <p className="mt-2 text-gray-600">
              Your account and employee assignment details.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex w-fit rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Dashboard
          </Link>
        </div>

        {loading ? (
          <p className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow-sm">
            Loading profile...
          </p>
        ) : error ? (
          <p className="rounded-lg bg-red-50 p-6 text-sm text-red-700">
            {error}
          </p>
        ) : user ? (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            <section className="rounded-lg bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Name</p>
              <h2 className="mt-3 text-xl font-semibold text-gray-900">
                {user.username}
              </h2>
            </section>

            <section className="rounded-lg bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Email</p>
              <h2 className="mt-3 break-words text-xl font-semibold text-gray-900">
                {user.email || "Not provided"}
              </h2>
            </section>

            <section className="rounded-lg bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Department</p>
              <h2 className="mt-3 text-xl font-semibold text-gray-900">
                {formatValue(user.department)}
              </h2>
            </section>

            <section className="rounded-lg bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-500">Role</p>
              <h2 className="mt-3 text-xl font-semibold text-gray-900">
                {formatValue(user.role)}
              </h2>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
