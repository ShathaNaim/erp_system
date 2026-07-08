"use client";

import { useEffect, useState } from "react";
import AddSupplierForm, { Supplier } from "@/components/add-supplier-form";
import { showConfirm } from "@/components/AppNotifications";

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
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
  });

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
        setIsManager(
          data.role === "admin" || data.role === "procurement_manager"
        );
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

  function startEditingSupplier(supplier: Supplier) {
    setEditingSupplier(supplier);
    setEditForm({
      name: supplier.name,
      contact_name: supplier.contact_name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
    });
  }

  async function updateSupplier(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingSupplier) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch(
      `http://127.0.0.1:8000/api/procurement/suppliers/${editingSupplier.id}/`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editForm),
      }
    );

    if (!res.ok) {
      alert("Failed to update supplier");
      return;
    }

    const updatedSupplier: Supplier = await res.json();
    setSuppliers((current) =>
      current.map((supplier) =>
        supplier.id === updatedSupplier.id ? updatedSupplier : supplier
      )
    );
    setEditingSupplier(null);
  }

  async function deleteSupplier(supplier: Supplier) {
    const confirmed = await showConfirm(`Delete supplier "${supplier.name}"?`);
    if (!confirmed) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch(
      `http://127.0.0.1:8000/api/procurement/suppliers/${supplier.id}/`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      alert(error?.detail ?? "Failed to delete supplier");
      return;
    }

    setSuppliers((current) =>
      current.filter((item) => item.id !== supplier.id)
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
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
              Only admins and procurement managers can create suppliers.
            </p>
          )
        )}
      </div>

      {editingSupplier && (
        <section className="mx-auto mt-10 max-w-3xl rounded-lg bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900">Edit Supplier</h2>
            <button
              type="button"
              onClick={() => setEditingSupplier(null)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={updateSupplier} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((current) => ({ ...current, name: e.target.value }))
                }
                className="rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Name"
                required
              />
              <input
                type="text"
                value={editForm.contact_name}
                onChange={(e) =>
                  setEditForm((current) => ({
                    ...current,
                    contact_name: e.target.value,
                  }))
                }
                className="rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Contact"
              />
              <input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((current) => ({ ...current, email: e.target.value }))
                }
                className="rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Email"
              />
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((current) => ({ ...current, phone: e.target.value }))
                }
                className="rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Phone"
              />
            </div>
            <textarea
              value={editForm.address}
              onChange={(e) =>
                setEditForm((current) => ({ ...current, address: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Address"
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700"
            >
              Save Changes
            </button>
          </form>
        </section>
      )}

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
                  <th className="py-3 pr-4 font-medium">Actions</th>
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
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingSupplier(supplier)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSupplier(supplier)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
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
