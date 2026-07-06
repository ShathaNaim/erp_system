"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AddCustomerForm, {
  Customer,
} from "@/components/add-customer-form";

const customersUrl = "http://127.0.0.1:8000/api/sales/customers/";

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

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
