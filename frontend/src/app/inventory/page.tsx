"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type InventoryStats = {
  finishedProducts: number;
  rawMaterials: number;
  lowMaterials: number;
};

type RecentFinishedProduct = {
  id: number;
  sku: string;
  name: string;
  available_quantity: string;
  unit: string;
};

type RecentRawMaterial = {
  id: number;
  sku: string;
  name: string;
  available_quantity: string;
  reorder_level: string;
  unit: string;
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
    title: "Check Product or Material",
    label: "Availability",
    statKey: "rawMaterials",
    description:
      "Check product or material availability and review shortage actions.",
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
  const [recentProducts, setRecentProducts] = useState<RecentFinishedProduct[]>(
    []
  );
  const [lowMaterials, setLowMaterials] = useState<RecentRawMaterial[]>([]);
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
        const finishedList = Array.isArray(finishedProducts)
          ? finishedProducts
          : [];
        const lowMaterialList = rawList.filter(
          (material) =>
            Number(material.available_quantity) <= Number(material.reorder_level)
        );

        setStats({
          finishedProducts: finishedList.length,
          rawMaterials: rawList.length,
          lowMaterials: lowMaterialList.length,
        });
        setRecentProducts(finishedList.slice(0, 4));
        setLowMaterials(lowMaterialList.slice(0, 4));
      } catch {
        setStats(initialStats);
        setRecentProducts([]);
        setLowMaterials([]);
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

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-700">Recent</p>
                <h2 className="text-xl font-bold text-gray-950">
                  Recent Stock Items
                </h2>
              </div>
              <Link
                href="/inventory/stock"
                className="text-sm font-semibold text-emerald-700 hover:underline"
              >
                View stock
              </Link>
            </div>

            {loading ? (
              <p className="text-sm text-gray-500">Loading stock...</p>
            ) : recentProducts.length === 0 ? (
              <p className="text-sm text-gray-500">No finished products found.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentProducts.map((product) => (
                  <div key={product.id} className="py-3">
                    <p className="font-semibold text-gray-950">
                      {product.sku} - {product.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Available: {product.available_quantity} {product.unit}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-emerald-700">Attention</p>
            <h2 className="text-xl font-bold text-gray-950">
              Low Raw Materials
            </h2>

            {loading ? (
              <p className="mt-4 text-sm text-gray-500">Loading materials...</p>
            ) : lowMaterials.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">
                No low raw materials right now.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-gray-100">
                {lowMaterials.map((material) => (
                  <div key={material.id} className="py-3">
                    <p className="font-semibold text-gray-950">
                      {material.sku} - {material.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {material.available_quantity} {material.unit} available,
                      reorder at {material.reorder_level}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
