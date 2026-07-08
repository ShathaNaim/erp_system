"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ProcurementStats = {
  orders: number;
  suppliers: number;
  materials: number;
};

type RecentPurchaseOrder = {
  id: number;
  order_number: string;
  supplier: number;
  status: string;
  order_date: string;
  supplier_name?: string;
};

const initialStats: ProcurementStats = {
  orders: 0,
  suppliers: 0,
  materials: 0,
};

const procurementSections = [
  {
    href: "/procurement/supplier",
    title: "Suppliers",
    label: "Partners",
    statKey: "suppliers",
    description: "Maintain supplier records for purchase orders and receipts.",
  },
  {
    href: "/procurement/material",
    title: "Raw Materials",
    label: "Materials",
    statKey: "materials",
    description:
      "Create raw materials that production can consume from inventory.",
  },
  {
    href: "/procurement/purchase-order",
    title: "Purchase Orders",
    label: "Supply",
    statKey: "orders",
    description: "Order raw materials and track incoming supply from vendors.",
  },
] as const;

export default function ProcurementPage() {
  const [stats, setStats] = useState<ProcurementStats>(initialStats);
  const [recentOrders, setRecentOrders] = useState<RecentPurchaseOrder[]>([]);
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
        const orderList = Array.isArray(orders) ? orders : [];
        const supplierList = Array.isArray(suppliers) ? suppliers : [];
        const supplierNames = new Map(
          supplierList.map((supplier) => [supplier.id, supplier.name])
        );

        setStats({
          orders: orderList.length,
          suppliers: supplierList.length,
          materials: Array.isArray(materials) ? materials.length : 0,
        });
        setRecentOrders(
          orderList.slice(0, 4).map((order) => ({
            ...order,
            supplier_name: supplierNames.get(order.supplier) ?? "Supplier",
          }))
        );
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
          <p className="text-sm font-semibold text-emerald-700">
            Procurement
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-gray-950">
            Manage suppliers, raw materials, and purchase orders for production.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
            Procurement keeps the material side of the ERP ready. Create
            suppliers, define raw materials, and prepare purchase orders for
            incoming supply.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {procurementSections.map((section) => (
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
                Recent Purchase Orders
              </h2>
            </div>
            <Link
              href="/procurement/purchase-order"
              className="text-sm font-semibold text-emerald-700 hover:underline"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading purchase orders...</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-gray-500">No recent purchase orders.</p>
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
                      {order.supplier_name} - {order.order_date}
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
