"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProductionStats = {
  orders: number;
  openOrders: number;
  products: number;
};

const initialStats: ProductionStats = {
  orders: 0,
  openOrders: 0,
  products: 0,
};

const productionSections = [
  {
    href: "/production/orders",
    title: "Production Orders",
    label: "Work",
    statKey: "openOrders",
    description:
      "Receive sales and inventory demand, consume materials, and record output.",
  },
  {
    href: "/production/plan",
    title: "Plan Stock Production",
    label: "Inventory",
    statKey: "orders",
    description:
      "Create production orders for stock without linking them to sales demand.",
  },
  {
    href: "/production/products",
    title: "Finished Products",
    label: "Products",
    statKey: "products",
    description:
      "Create and review finished products that sales can offer and production can make.",
  },
] as const;

export default function ProductionPage() {
  const [stats, setStats] = useState<ProductionStats>(initialStats);
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
        const [ordersRes, productsRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/production/production-orders/", {
            headers,
          }),
          fetch("http://127.0.0.1:8000/api/production/finished-products/", {
            headers,
          }),
        ]);

        if (!ordersRes.ok || !productsRes.ok) {
          throw new Error("Failed to load production stats");
        }

        const [orders, products] = await Promise.all([
          ordersRes.json(),
          productsRes.json(),
        ]);
        const orderList = Array.isArray(orders) ? orders : [];

        setStats({
          orders: orderList.length,
          openOrders: orderList.filter(
            (order) =>
              order.status !== "completed" && order.status !== "cancelled"
          ).length,
          products: Array.isArray(products) ? products.length : 0,
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
          <p className="text-sm font-semibold text-emerald-700">Production</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-gray-950">
            Manage production work, planned stock, and finished products.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
            Production receives demand from sales shortages and inventory stock
            plans. Use focused pages for order execution, stock planning, and
            finished product setup.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {productionSections.map((section) => (
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
