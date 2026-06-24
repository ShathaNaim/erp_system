"use client";

import { useEffect, useState } from "react";
import AddSupplierForm, { Supplier } from "@/components/add-supplier-form";

type CurrentUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  department: string;
};

export default function SupplierPage() {
  const [isManager, setIsManager] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  useEffect(() => {
    async function loadCurrentUser() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setLoadingUser(false);
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/api/accounts/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data: CurrentUser = await res.json();
        setUser(data);
        setIsManager(data.role === "procurement_manager");
      } finally {
        setLoadingUser(false);
      }
    }

    loadCurrentUser();
  }, []);

  useEffect(() => {
    async function loadSuppliers() {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const res = await fetch(
        "http://127.0.0.1:8000/api/procurement/suppliers/",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        alert("Failed to load suppliers");
        return;
      }

      const data: Supplier[] = await res.json();
      setSuppliers(data);
    }

    loadSuppliers();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Supplier</h1>
        {loadingUser ? (
          <p className="mb-4 text-sm text-gray-500">Loading user...</p>
        ) : user ? (
          <p className="mb-4 text-sm text-gray-500">
            Logged in as {user.username} ({user.role})
          </p>
        ) : (
          <p className="mb-4 text-sm text-red-600">User info not available.</p>
        )}

        {isManager ? (
          <AddSupplierForm
            onCreated={(supplier) =>
              setSuppliers((current) => [...current, supplier])
            }
          />
        ) : (
          !loadingUser && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Only procurement managers can create suppliers.
            </p>
          )
        )}
      </div>

      <section className="mx-auto mt-10 max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-gray-900">Supplier List</h2>
        {suppliers.length === 0 ? (
          <p className="text-sm text-gray-500">No suppliers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Contact</th>
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 text-gray-900">{supplier.name}</td>
                    <td className="py-3 pr-4 text-gray-700">
                      {supplier.contact_name || "-"}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {supplier.email || "-"}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {supplier.phone || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
