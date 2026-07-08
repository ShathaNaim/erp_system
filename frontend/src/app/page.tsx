"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { canSeeMainDashboard, getUserHomePath } from "@/lib/auth-routing";

type SalesOrder = {
  id: number;
  order_number: string;
  status: string;
  order_date: string;
  lines: unknown[];
};

type ProductionOrder = {
  id: number;
  order_number: string;
  product_name: string;
  status: string;
  planned_quantity: string;
  produced_quantity: string;
};

type PurchaseOrder = {
  id: number;
  order_number: string;
  status: string;
  order_date: string;
};

type RawMaterial = {
  id: number;
  sku: string;
  name: string;
  available_quantity: string;
  reorder_level: string;
};

type FinishedProduct = {
  id: number;
  available_quantity: string;
};

type DashboardData = {
  salesOrders: SalesOrder[];
  productionOrders: ProductionOrder[];
  purchaseOrders: PurchaseOrder[];
  rawMaterials: RawMaterial[];
  finishedProducts: FinishedProduct[];
};

type CurrentUser = {
  role?: string;
  department?: string;
};

const initialData: DashboardData = {
  salesOrders: [],
  productionOrders: [],
  purchaseOrders: [],
  rawMaterials: [],
  finishedProducts: [],
};

function formatStatus(status: string) {
  return status
    .replace("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function countByStatus(items: { status: string }[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, {});
}

function getSalesTrend(orders: SalesOrder[]) {
  const counts = orders.reduce<Record<string, number>>((result, order) => {
    result[order.order_date] = (result[order.order_date] ?? 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .slice(-7)
    .map(([date, count]) => ({
      label: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      count,
    }));
}

function SalesTrendChart({ data }: { data: { label: string; count: number }[] }) {
  const width = 520;
  const height = 220;
  const padding = 28;
  const max = Math.max(...data.map((item) => item.count), 1);
  const points =
    data.length > 1
      ? data.map((item, index) => {
          const x =
            padding +
            (index / (data.length - 1)) * (width - padding * 2);
          const y =
            height -
            padding -
            (item.count / max) * (height - padding * 2);
          return { ...item, x, y };
        })
      : data.map((item) => ({
          ...item,
          x: width / 2,
          y:
            height -
            padding -
            (item.count / max) * (height - padding * 2),
        }));
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm xl:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1f2f50]">Sales Trend</h2>
          <p className="mt-1 text-sm text-gray-500">
            Sales orders by order date
          </p>
        </div>
        <span className="rounded-lg bg-[#e8f7f5] px-3 py-1 text-sm font-semibold text-[#0f9f94]">
          Last 7 dates
        </span>
      </div>

      {data.length === 0 ? (
        <p className="mt-8 text-sm text-gray-500">No sales orders yet.</p>
      ) : (
        <div className="mt-5 overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full">
            {[0, 1, 2, 3].map((line) => {
              const y = padding + line * ((height - padding * 2) / 3);
              return (
                <line
                  key={line}
                  x1={padding}
                  x2={width - padding}
                  y1={y}
                  y2={y}
                  stroke="#edf2f6"
                  strokeWidth="1"
                />
              );
            })}
            <path
              d={path}
              fill="none"
              stroke="#0f9f94"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((point) => (
              <g key={point.label}>
                <circle cx={point.x} cy={point.y} r="5" fill="#1f2f50" />
                <text
                  x={point.x}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-gray-500 text-[11px]"
                >
                  {point.label}
                </text>
                <text
                  x={point.x}
                  y={point.y - 12}
                  textAnchor="middle"
                  className="fill-[#1f2f50] text-[12px] font-semibold"
                >
                  {point.count}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}

const chartColors = ["#0f9f94", "#1f2f50", "#f59e0b", "#94a3b8", "#ef4444"];

function DonutChart({
  title,
  data,
  subtitle,
}: {
  title: string;
  data: Record<string, number>;
  subtitle: string;
}) {
  const entries = Object.entries(data).filter(([, value]) => value > 0);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-[#1f2f50]">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No data yet.</p>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">
          <div className="relative mx-auto size-36">
            <svg viewBox="0 0 120 120" className="size-36 -rotate-90">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="#edf2f6"
                strokeWidth="18"
              />
              {entries.map(([label, value], index) => {
                const length = (value / total) * circumference;
                const strokeDasharray = `${length} ${circumference - length}`;
                const strokeDashoffset = -offset;
                offset += length;

                return (
                  <circle
                    key={label}
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={chartColors[index % chartColors.length]}
                    strokeWidth="18"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-[#1f2f50]">{total}</span>
              <span className="text-xs font-medium text-gray-500">total</span>
            </div>
          </div>

          <div className="space-y-3">
            {entries.map(([label, value], index) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium text-[#34445c]">
                  <span
                    className="size-2.5 rounded-full"
                    style={{
                      backgroundColor: chartColors[index % chartColors.length],
                    }}
                  />
                  {formatStatus(label)}
                </span>
                <span className="text-sm font-semibold text-[#1f2f50]">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ShortageBarChart({ materials }: { materials: RawMaterial[] }) {
  const shortages = materials
    .map((material) => ({
      ...material,
      shortage: Math.max(
        Number(material.reorder_level) - Number(material.available_quantity),
        0
      ),
    }))
    .filter((material) => material.shortage > 0)
    .sort((a, b) => b.shortage - a.shortage)
    .slice(0, 6);
  const max = Math.max(...shortages.map((material) => material.shortage), 1);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm xl:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1f2f50]">
            Inventory Shortages
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Raw materials below reorder level
          </p>
        </div>
        <Link
          href="/inventory/stock"
          className="text-sm font-semibold text-[#0f9f94] hover:underline"
        >
          View stock
        </Link>
      </div>

      {shortages.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">
          No inventory shortages right now.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {shortages.map((material) => (
            <div key={material.id}>
              <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-[#34445c]">
                  {material.sku} - {material.name}
                </span>
                <span className="font-semibold text-amber-700">
                  {material.shortage.toLocaleString(undefined, {
                    maximumFractionDigits: 3,
                  })}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{
                    width: `${Math.max((material.shortage / max) * 100, 8)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function Home() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        router.replace("/login");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      try {
        const userRes = await fetch("http://127.0.0.1:8000/api/accounts/me/", {
          headers,
        });

        if (!userRes.ok) {
          router.replace("/login");
          return;
        }

        const user: CurrentUser = await userRes.json();
        if (!canSeeMainDashboard(user.role)) {
          router.replace(getUserHomePath(user));
          return;
        }

        setAllowed(true);

        const [
          salesRes,
          productionRes,
          purchaseRes,
          rawRes,
          finishedRes,
        ] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/sales/sales-orders/", { headers }),
          fetch("http://127.0.0.1:8000/api/production/production-orders/", {
            headers,
          }),
          fetch("http://127.0.0.1:8000/api/procurement/purchase-orders/", {
            headers,
          }),
          fetch("http://127.0.0.1:8000/api/inventory/raw-materials/", {
            headers,
          }),
          fetch("http://127.0.0.1:8000/api/inventory/finished-products/", {
            headers,
          }),
        ]);

        if (
          !salesRes.ok ||
          !productionRes.ok ||
          !purchaseRes.ok ||
          !rawRes.ok ||
          !finishedRes.ok
        ) {
          throw new Error("Failed to load dashboard");
        }

        const [
          salesOrders,
          productionOrders,
          purchaseOrders,
          rawMaterials,
          finishedProducts,
        ] = await Promise.all([
          salesRes.json(),
          productionRes.json(),
          purchaseRes.json(),
          rawRes.json(),
          finishedRes.json(),
        ]);

        setData({
          salesOrders: Array.isArray(salesOrders) ? salesOrders : [],
          productionOrders: Array.isArray(productionOrders)
            ? productionOrders
            : [],
          purchaseOrders: Array.isArray(purchaseOrders) ? purchaseOrders : [],
          rawMaterials: Array.isArray(rawMaterials) ? rawMaterials : [],
          finishedProducts: Array.isArray(finishedProducts)
            ? finishedProducts
            : [],
        });
      } catch {
        setData(initialData);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  const analytics = useMemo(() => {
    const openProduction = data.productionOrders.filter(
      (order) => !["completed", "cancelled"].includes(order.status)
    );
    const lowMaterials = data.rawMaterials.filter(
      (material) =>
        Number(material.available_quantity) <= Number(material.reorder_level)
    );
    const readySalesOrders = data.salesOrders.filter(
      (order) => order.status === "ready"
    );
    const pendingPurchaseOrders = data.purchaseOrders.filter(
      (order) => !["received", "cancelled"].includes(order.status)
    );
    const stockWithQuantity = data.finishedProducts.filter(
      (product) => Number(product.available_quantity) > 0
    );

    return {
      openProduction,
      lowMaterials,
      readySalesOrders,
      pendingPurchaseOrders,
      stockWithQuantity,
      salesStatus: countByStatus(data.salesOrders),
      productionStatus: countByStatus(data.productionOrders),
      purchaseStatus: countByStatus(data.purchaseOrders),
      salesTrend: getSalesTrend(data.salesOrders),
    };
  }, [data]);

  const kpis = [
    {
      label: "Sales Orders",
      value: data.salesOrders.length,
      detail: `${analytics.readySalesOrders.length} ready to ship`,
      href: "/sales/order",
    },
    {
      label: "Open Production",
      value: analytics.openProduction.length,
      detail: "Orders still in progress",
      href: "/production/orders",
    },
    {
      label: "Low Materials",
      value: analytics.lowMaterials.length,
      detail: "At or below reorder level",
      href: "/inventory/stock",
    },
    {
      label: "Pending Supply",
      value: analytics.pendingPurchaseOrders.length,
      detail: "Purchase orders not received",
      href: "/procurement/purchase-order",
    },
  ];

  const inventoryHealthy =
    data.rawMaterials.length > 0
      ? Math.round(
          ((data.rawMaterials.length - analytics.lowMaterials.length) /
            data.rawMaterials.length) *
            100
        )
      : 0;

  if (!allowed) {
    return (
      <main className="min-h-screen bg-gray-50 px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <section className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
            Checking dashboard access...
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col justify-between gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold text-[#0f9f94]">
              Operations Analytics
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#1f2f50]">
              ERP performance overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Track demand, production workload, material risk, and supply
              status from one dashboard.
            </p>
          </div>
          <p className="text-sm font-medium text-gray-500">
            {loading ? "Loading analytics..." : "Live from current ERP records"}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9ee7df] hover:shadow-md"
            >
              <p className="text-sm font-semibold text-gray-500">{kpi.label}</p>
              <p className="mt-3 text-4xl font-bold text-[#1f2f50]">
                {loading ? "..." : kpi.value}
              </p>
              <p className="mt-2 text-sm text-gray-600">{kpi.detail}</p>
            </Link>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <SalesTrendChart data={analytics.salesTrend} />
          <DonutChart
            title="Production Order Status"
            data={analytics.productionStatus}
            subtitle="Current work order mix"
          />
          <ShortageBarChart materials={data.rawMaterials} />
          <DonutChart
            title="Purchase Order Status"
            data={analytics.purchaseStatus}
            subtitle="Supply pipeline mix"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#1f2f50]">
              Inventory Health
            </h2>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-[#34445c]">
                  Materials above reorder level
                </span>
                <span className="font-semibold text-[#1f2f50]">
                  {inventoryHealthy}%
                </span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#0f9f94]"
                  style={{ width: `${inventoryHealthy}%` }}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-[#f8fbfd] p-4">
                <p className="text-sm text-gray-500">Finished items in stock</p>
                <p className="mt-2 text-2xl font-bold text-[#1f2f50]">
                  {analytics.stockWithQuantity.length}
                </p>
              </div>
              <div className="rounded-lg bg-[#fff7ed] p-4">
                <p className="text-sm text-gray-500">Materials needing action</p>
                <p className="mt-2 text-2xl font-bold text-amber-700">
                  {analytics.lowMaterials.length}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#1f2f50]">
              Recent Activity
            </h2>
            <div className="mt-4 divide-y divide-gray-100">
              {data.productionOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-gray-950">
                      {order.order_number}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.product_name} - {order.produced_quantity}/
                      {order.planned_quantity} produced
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
                    {formatStatus(order.status)}
                  </span>
                </div>
              ))}
              {!loading && data.productionOrders.length === 0 && (
                <p className="py-3 text-sm text-gray-500">
                  No recent production activity.
                </p>
              )}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
