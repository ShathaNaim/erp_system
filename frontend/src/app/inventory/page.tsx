"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InventoryStats = {
  finishedProducts: number;
  rawMaterials: number;
  lowMaterials: number;
};

const initialStats: InventoryStats = {
  finishedProducts: 0,
  rawMaterials: 0,
  lowMaterials: 0,
};

const inventorySections = [
  {
    href: "/inventory/stock",
    title: "Stock Overview",
    label: "Stock",
    statKey: "finishedProducts",
    description: "Review finished product and raw material quantities.",
  },
  {
    href: "/inventory/check-product",
    title: "Check Product",
    label: "Availability",
    statKey: "rawMaterials",
    description:
      "Check product availability and create production orders for shortages.",
  },
  {
    href: "/inventory/sales-orders",
    title: "Sales Order Fulfillment",
    label: "Shipping",
    statKey: "lowMaterials",
    description:
      "Check sales order stock, request production, and mark orders shipped.",
  },
] as const;

export default function InventoryPage() {
  const [stats, setStats] = useState<InventoryStats>(initialStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [finishedRes, rawRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/inventory/finished-products/", {
            headers,
          }),
          fetch("http://127.0.0.1:8000/api/inventory/raw-materials/", {
            headers,
          }),
        ]);

        if (!finishedRes.ok || !rawRes.ok) {
          throw new Error("Failed to load inventory stats");
        }

        const [finishedProducts, rawMaterials] = await Promise.all([
          finishedRes.json(),
          rawRes.json(),
        ]);
        const rawList = Array.isArray(rawMaterials) ? rawMaterials : [];

        setStats({
          finishedProducts: Array.isArray(finishedProducts)
            ? finishedProducts.length
            : 0,
          rawMaterials: rawList.length,
          lowMaterials: rawList.filter(
            (material) =>
              Number(material.available_quantity) <=
              Number(material.reorder_level)
          ).length,
        });
      } catch {
        setStats(initialStats);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">Inventory</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-gray-950">
            Manage stock availability, shortages, and customer shipment.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
            Inventory connects sales, production, and procurement. Check
            available stock, request production for shortages, and ship sales
            orders when goods are ready.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {inventorySections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    {section.label}
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-gray-950">
                    {section.title}
                  </h2>
                </div>
                <span className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  Open
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">
                {section.description}
              </p>
              <p className="mt-5 text-3xl font-bold text-gray-950">
                {loading ? "..." : stats[section.statKey]}
              </p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
