"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SalesStats = {
  customers: number;
  orders: number;
};

type RecentSalesOrder = {
  id: number;
  order_number: string;
  status: string;
  order_date: string;
  lines: unknown[];
};

const initialStats: SalesStats = {
  customers: 0,
  orders: 0,
};

const salesSections = [
  {
    href: "/sales/customer",
    title: "Customers",
    label: "Master data",
    statKey: "customers",
    description: "Create customers and keep customer contact details ready for orders.",
  },
  {
    href: "/sales/order",
    title: "Sales Orders",
    label: "Demand",
    statKey: "orders",
    description:
      "Create customer orders, confirm demand, and route shortages to production.",
  },
] as const;

export default function SalesPage() {
  const [stats, setStats] = useState<SalesStats>(initialStats);
  const [recentOrders, setRecentOrders] = useState<RecentSalesOrder[]>([]);
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
        const [customersRes, ordersRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/sales/customers/", { headers }),
          fetch("http://127.0.0.1:8000/api/sales/sales-orders/", { headers }),
        ]);

        if (!customersRes.ok || !ordersRes.ok) {
          throw new Error("Failed to load sales stats");
        }

        const [customers, orders] = await Promise.all([
          customersRes.json(),
          ordersRes.json(),
        ]);
        const orderList = Array.isArray(orders) ? orders : [];

        setStats({
          customers: Array.isArray(customers) ? customers.length : 0,
          orders: orderList.length,
        });
        setRecentOrders(orderList.slice(0, 4));
      } catch {
        setStats(initialStats);
        setRecentOrders([]);
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
          <p className="text-sm font-semibold text-emerald-700">Sales</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-gray-950">
            Manage customers and create sales demand for inventory and
            production.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
            Start with customer records, then create sales orders. Confirmed
            orders can use available stock or generate production work when
            inventory is short.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {salesSections.map((section) => (
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

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Recent</p>
              <h2 className="text-xl font-bold text-gray-950">
                Recent Sales Orders
              </h2>
            </div>
            <Link
              href="/sales/order"
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading recent orders...</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500">No recent sales orders.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-gray-950">
                      {order.order_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.order_date} - {order.lines.length} item
                      {order.lines.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
                    {order.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
