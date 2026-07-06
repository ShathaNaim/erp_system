"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ProductionOrder = {
  id: number;
  order_number: string;
  source: "sales" | "inventory";
  sales_order_number: string | null;
  product_sku: string;
  product_name: string;
  planned_quantity: string;
  produced_quantity: string;
  status: "planned" | "released" | "in_progress" | "completed" | "cancelled";
  due_date: string | null;
  notes: string;
};

type RawMaterialStock = {
  id: number;
  sku: string;
  name: string;
  unit: string;
  available_quantity: string;
};

const productionOrdersUrl =
  "http://127.0.0.1:8000/api/production/production-orders/";
const rawMaterialsUrl = "http://127.0.0.1:8000/api/inventory/raw-materials/";

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatQuantity(value: string | number) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function StatusBadge({ status }: { status: ProductionOrder["status"] }) {
  const colors: Record<ProductionOrder["status"], string> = {
    planned: "bg-gray-100 text-gray-700",
    released: "bg-blue-50 text-blue-700",
    in_progress: "bg-amber-50 text-amber-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-red-50 text-red-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${colors[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function SourceBadge({ source }: { source: ProductionOrder["source"] }) {
  const className =
    source === "sales"
      ? "bg-indigo-50 text-indigo-700"
      : "bg-emerald-50 text-emerald-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {source === "sales" ? "Sales" : "Inventory"}
    </span>
  );
}

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [completeQuantities, setCompleteQuantities] = useState<
    Record<number, string>
  >({});
  const [materialInputs, setMaterialInputs] = useState<
    Record<number, { rawMaterialSku: string; quantity: string }>
  >({});

  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "completed" && order.status !== "cancelled"
      ),
    [orders]
  );

  async function loadOrders() {
    const headers = getAuthHeaders();
    const [ordersRes, rawMaterialsRes] = await Promise.all([
      fetch(productionOrdersUrl, { headers }),
      fetch(rawMaterialsUrl, { headers }),
    ]);

    if (!ordersRes.ok || !rawMaterialsRes.ok) {
      alert("Failed to load production orders");
      return;
    }

    const [ordersData, rawMaterialsData] = await Promise.all([
      ordersRes.json() as Promise<ProductionOrder[]>,
      rawMaterialsRes.json() as Promise<RawMaterialStock[]>,
    ]);
    setOrders(ordersData);
    setRawMaterials(rawMaterialsData);
  }

  useEffect(() => {
    async function loadPage() {
      try {
        await loadOrders();
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, []);

  function updateOrder(updatedOrder: ProductionOrder) {
    setOrders((current) =>
      current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );
  }

  async function runOrderAction(order: ProductionOrder, action: string) {
    const res = await fetch(`${productionOrdersUrl}${order.id}/${action}/`, {
      method: "POST",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      alert(`Failed to ${action} production order`);
      return;
    }

    updateOrder(await res.json());
  }

  async function completeOrder(order: ProductionOrder) {
    const producedQuantity = completeQuantities[order.id];
    if (!producedQuantity) {
      alert("Enter the produced quantity first");
      return;
    }

    const res = await fetch(`${productionOrdersUrl}${order.id}/complete/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ produced_quantity: Number(producedQuantity) }),
    });

    if (!res.ok) {
      alert("Failed to complete production order");
      return;
    }

    updateOrder(await res.json());
    setCompleteQuantities((current) => ({ ...current, [order.id]: "" }));
  }

  async function consumeMaterial(order: ProductionOrder) {
    const materialInput = materialInputs[order.id];
    if (!materialInput?.rawMaterialSku || !materialInput.quantity) {
      alert("Select the raw material and enter the quantity first");
      return;
    }

    const res = await fetch(`${productionOrdersUrl}${order.id}/consume-material/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        raw_material_name: materialInput.rawMaterialSku,
        quantity: Number(materialInput.quantity),
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      alert(error?.detail ?? "Failed to consume raw material");
      return;
    }

    setMaterialInputs((current) => ({
      ...current,
      [order.id]: { rawMaterialSku: "", quantity: "" },
    }));
    await loadOrders();
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/production"
          className="mb-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          &larr; Back to Production
        </Link>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row">
            <div>
              <h1 className="text-2xl font-bold text-gray-950">
                Production Orders
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Execute orders from sales demand or inventory stock plans.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              {loading ? "Loading..." : `${openOrders.length} open`}
            </p>
          </div>

          {orders.length === 0 ? (
            <p className="text-sm text-gray-500">No production orders found.</p>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-gray-900">
                          {order.order_number}
                        </h2>
                        <SourceBadge source={order.source} />
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="mt-2 text-sm text-gray-700">
                        {order.product_sku} - {order.product_name}
                      </p>
                      {order.sales_order_number && (
                        <p className="mt-1 text-sm text-gray-500">
                          Sales order: {order.sales_order_number}
                        </p>
                      )}
                    </div>

                    <div className="text-sm text-gray-700 md:text-right">
                      <p>Planned: {formatQuantity(order.planned_quantity)}</p>
                      <p>Produced: {formatQuantity(order.produced_quantity)}</p>
                      <p>Due: {order.due_date ?? "Not set"}</p>
                    </div>
                  </div>

                  {order.notes && (
                    <p className="mt-3 text-sm text-gray-500">{order.notes}</p>
                  )}

                  <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 lg:flex-row lg:items-center">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => runOrderAction(order, "release")}
                        disabled={order.status !== "planned"}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Release
                      </button>
                      <button
                        type="button"
                        onClick={() => runOrderAction(order, "start")}
                        disabled={!["planned", "released"].includes(order.status)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Start
                      </button>
                      <button
                        type="button"
                        onClick={() => runOrderAction(order, "cancel")}
                        disabled={["completed", "cancelled"].includes(order.status)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="flex flex-1 flex-col gap-2 sm:flex-row lg:justify-end">
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={completeQuantities[order.id] ?? ""}
                        onChange={(e) =>
                          setCompleteQuantities((current) => ({
                            ...current,
                            [order.id]: e.target.value,
                          }))
                        }
                        disabled={["completed", "cancelled"].includes(order.status)}
                        placeholder="Produced qty"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => completeOrder(order)}
                        disabled={["completed", "cancelled"].includes(order.status)}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Receive Output
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 sm:grid-cols-[1fr_160px_auto]">
                    <select
                      value={materialInputs[order.id]?.rawMaterialSku ?? ""}
                      onChange={(e) =>
                        setMaterialInputs((current) => ({
                          ...current,
                          [order.id]: {
                            rawMaterialSku: e.target.value,
                            quantity: current[order.id]?.quantity ?? "",
                          },
                        }))
                      }
                      disabled={["completed", "cancelled"].includes(order.status)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Select raw material</option>
                      {rawMaterials.map((material) => (
                        <option key={material.id} value={material.sku}>
                          {material.sku} - {material.name} (stock:{" "}
                          {formatQuantity(material.available_quantity)}{" "}
                          {material.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={materialInputs[order.id]?.quantity ?? ""}
                      onChange={(e) =>
                        setMaterialInputs((current) => ({
                          ...current,
                          [order.id]: {
                            rawMaterialSku:
                              current[order.id]?.rawMaterialSku ?? "",
                            quantity: e.target.value,
                          },
                        }))
                      }
                      disabled={["completed", "cancelled"].includes(order.status)}
                      placeholder="Used qty"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => consumeMaterial(order)}
                      disabled={["completed", "cancelled"].includes(order.status)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Use Material
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
