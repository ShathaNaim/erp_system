"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api-base";
import { getActionErrorMessage } from "@/lib/api";
import AddCustomerForm, {
  Customer,
} from "@/components/add-customer-form";
import { showConfirm } from "@/components/AppNotifications";

const customersUrl = apiUrl("/api/sales/customers/");

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    is_active: true,
  });

  useEffect(() => {
    async function loadCustomers() {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const res = await fetch(customersUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        alert("Failed to load customers");
        return;
      }

      const data: Customer[] = await res.json();
      setCustomers(data);
    }

    loadCustomers();
  }, []);

  function startEditingCustomer(customer: Customer) {
    setEditingCustomer(customer);
    setEditForm({
      name: customer.name,
      contact_name: customer.contact_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      is_active: customer.is_active,
    });
  }

  async function updateCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingCustomer) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("You must be logged in to edit customers");
      return;
    }

    const res = await fetch(`${customersUrl}${editingCustomer.id}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editForm),
    });

    if (!res.ok) {
      alert(getActionErrorMessage(res, "Failed to update customer"));
      return;
    }

    const updatedCustomer: Customer = await res.json();
    setCustomers((current) =>
      current.map((customer) =>
        customer.id === updatedCustomer.id ? updatedCustomer : customer
      )
    );
    setEditingCustomer(null);
  }

  async function deleteCustomer(customer: Customer) {
    const confirmed = await showConfirm(`Delete customer "${customer.name}"?`);
    if (!confirmed) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("You must be logged in to delete customers");
      return;
    }

    const res = await fetch(`${customersUrl}${customer.id}/`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      alert(error?.detail ?? "Failed to delete customer");
      return;
    }

    setCustomers((current) =>
      current.filter((item) => item.id !== customer.id)
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/sales"
          className="mb-4 inline-block text-sm text-emerald-700 hover:underline"
        >
          ← Back to Sales
        </Link>

        <section className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="mb-6 text-2xl font-bold text-gray-900">
            Add Customer
          </h1>
          <AddCustomerForm
            onCreated={(customer) =>
              setCustomers((current) => [...current, customer])
            }
          />
        </section>

        {editingCustomer && (
          <section className="mt-10 rounded-lg bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">
                Edit Customer
              </h2>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={updateCustomer} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((current) => ({
                        ...current,
                        name: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Contact
                  </label>
                  <input
                    type="text"
                    value={editForm.contact_name}
                    onChange={(e) =>
                      setEditForm((current) => ({
                        ...current,
                        contact_name: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((current) => ({
                        ...current,
                        email: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((current) => ({
                        ...current,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm((current) => ({
                      ...current,
                      address: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) =>
                    setEditForm((current) => ({
                      ...current,
                      is_active: e.target.checked,
                    }))
                  }
                />
                Active customer
              </label>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700"
              >
                Save Changes
              </button>
            </form>
          </section>
        )}

        <section className="mt-10 rounded-lg bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-bold text-gray-900">Customers</h2>
          {customers.length === 0 ? (
            <p className="text-sm text-gray-500">No customers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-3 pr-4 font-medium">Name</th>
                    <th className="py-3 pr-4 font-medium">Contact</th>
                    <th className="py-3 pr-4 font-medium">Email</th>
                    <th className="py-3 pr-4 font-medium">Active</th>
                    <th className="py-3 pr-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-100">
                      <td className="py-3 pr-4 text-gray-900">
                        {customer.name}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {customer.contact_name || "-"}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {customer.email || "-"}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {customer.is_active ? "Yes" : "No"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingCustomer(customer)}
                            className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCustomer(customer)}
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
      </div>
    </main>
  );
}
