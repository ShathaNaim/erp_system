"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProcurementStats = {
  orders: number;
  suppliers: number;
  materials: number;
};

const initialStats: ProcurementStats = {
  orders: 0,
  suppliers: 0,
  materials: 0,
};

export default function ProcurementPage() {
  const router = useRouter();
  const [stats, setStats] = useState<ProcurementStats>(initialStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null;

      try {
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const [ordersRes, suppliersRes, materialsRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/procurement/purchase-orders/", {
            headers,
          }),
          fetch("http://127.0.0.1:8000/api/procurement/suppliers/", {
            headers,
          }),
          fetch("http://127.0.0.1:8000/api/procurement/raw-materials/", {
            headers,
          }),
        ]);

        if (!ordersRes.ok || !suppliersRes.ok || !materialsRes.ok) {
          throw new Error("Failed to load procurement stats");
        }

        const [orders, suppliers, materials] = await Promise.all([
          ordersRes.json(),
          suppliersRes.json(),
          materialsRes.json(),
        ]);

        setStats({
          orders: Array.isArray(orders) ? orders.length : 0,
          suppliers: Array.isArray(suppliers) ? suppliers.length : 0,
          materials: Array.isArray(materials) ? materials.length : 0,
        });
      } catch {
        setStats(initialStats);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const cards = [
    { label: "Orders", value: stats.orders },
    { label: "Suppliers", value: stats.suppliers },
    { label: "Materials", value: stats.materials },
  ];

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => router.push("/procurement/supplier")}
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Add New Supplier
          </button>
          <button
            onClick={() => router.push("/procurement/material")}
            className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Add New Material
          </button>
          <button
            onClick={() => router.push("/procurement/purchase-order")}
            className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Add New Purchase Order
          </button>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <div key={card.label} className="rounded-lg bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {loading ? "..." : card.value}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
