"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authenticatedFetch } from "@/lib/api";

type ProductionOrder = {
  id: number;
  order_number: string;
  source: "sales" | "inventory";
  sales_order_number: string | null;
  product_sku: string;
  product_name: string;
  bill_of_material: number | null;
  bill_of_material_version: string | null;
  planned_quantity: string;
  produced_quantity: string;
  status: "planned" | "released" | "in_progress" | "completed" | "cancelled";
  due_date: string | null;
  notes: string;
  material_consumptions: MaterialConsumption[];
};

type MaterialConsumption = {
  id: number;
  raw_material_name: string;
  quantity: string;
  consumed_at: string;
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
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [completeQuantities, setCompleteQuantities] = useState<
    Record<number, string>
  >({});
  const [materialInputs, setMaterialInputs] = useState<
    Record<number, { rawMaterialSku: string; quantity: string }>
  >({});
  const [bomQuantities, setBomQuantities] = useState<Record<number, string>>({});
  const [successMessages, setSuccessMessages] = useState<Record<number, string>>(
    {}
  );

  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "completed" && order.status !== "cancelled"
      ),
    [orders]
  );

  const handleAuthExpired = useCallback(() => {
    alert("Your session expired. Please sign in again.");
    router.push("/login");
  }, [router]);

  const loadOrders = useCallback(async () => {
    const [ordersRes, rawMaterialsRes] = await Promise.all([
      authenticatedFetch(productionOrdersUrl, {}, handleAuthExpired),
      authenticatedFetch(rawMaterialsUrl, {}, handleAuthExpired),
    ]);

    if (ordersRes.status === 401 || rawMaterialsRes.status === 401) {
      return;
    }

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
  }, [handleAuthExpired]);

  useEffect(() => {
    async function loadPage() {
      try {
        await loadOrders();
      } finally {
        setLoading(false);
      }
    }

    loadPage();
  }, [loadOrders]);

  function updateOrder(updatedOrder: ProductionOrder) {
    setOrders((current) =>
      current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order))
    );
  }

  async function runOrderAction(order: ProductionOrder, action: string) {
    const res = await authenticatedFetch(
      `${productionOrdersUrl}${order.id}/${action}/`,
      { method: "POST" },
      handleAuthExpired
    );

    if (res.status === 401) return;

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      alert(error?.detail ?? `Failed to ${action} production order`);
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

    const res = await authenticatedFetch(
      `${productionOrdersUrl}${order.id}/complete/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ produced_quantity: Number(producedQuantity) }),
      },
      handleAuthExpired
    );

    if (res.status === 401) return;

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      alert(error?.detail ?? "Failed to complete production order");
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

    const res = await authenticatedFetch(
      `${productionOrdersUrl}${order.id}/consume-material/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          raw_material_name: materialInput.rawMaterialSku,
          quantity: Number(materialInput.quantity),
        }),
      },
      handleAuthExpired
    );

    if (res.status === 401) return;

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      alert(error?.detail ?? "Failed to consume raw material");
      return;
    }

    const consumption: MaterialConsumption = await res.json();

    setMaterialInputs((current) => ({
      ...current,
      [order.id]: { rawMaterialSku: "", quantity: "" },
    }));
    setSuccessMessages((current) => ({
      ...current,
      [order.id]: `Consumed ${formatQuantity(consumption.quantity)} of ${consumption.raw_material_name}.`,
    }));
    await loadOrders();
  }

  async function consumeBom(order: ProductionOrder) {
    if (!order.bill_of_material) {
      alert("Attach a bill of material to this production order first");
      return;
    }

    const productionQuantity = bomQuantities[order.id];
    const body = productionQuantity
      ? { production_quantity: Number(productionQuantity) }
      : {};

    const res = await authenticatedFetch(
      `${productionOrdersUrl}${order.id}/consume-bom/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
      handleAuthExpired
    );

    if (res.status === 401) return;

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      alert(error?.detail ?? "Failed to consume BOM materials");
      return;
    }

    const consumptions: MaterialConsumption[] = await res.json();
    const totalLines = consumptions.length;

    setBomQuantities((current) => ({ ...current, [order.id]: "" }));
    setSuccessMessages((current) => ({
      ...current,
      [order.id]: `BOM consumed successfully: ${totalLines} material line${
        totalLines === 1 ? "" : "s"
      } used.`,
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
                      {order.bill_of_material_version && (
                        <p className="mt-1 text-sm text-gray-500">
                          BOM: v{order.bill_of_material_version}
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

                  {successMessages[order.id] && (
                    <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                      {successMessages[order.id]}
                    </p>
                  )}

                  {order.material_consumptions.length > 0 && (
                    <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        Materials consumed
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-gray-700">
                        {order.material_consumptions.slice(0, 4).map((item) => (
                          <li key={item.id}>
                            {item.raw_material_name}:{" "}
                            {formatQuantity(item.quantity)}
                          </li>
                        ))}
                      </ul>
                    </div>
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

                  <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 sm:grid-cols-[160px_auto_1fr]">
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={bomQuantities[order.id] ?? ""}
                      onChange={(e) =>
                        setBomQuantities((current) => ({
                          ...current,
                          [order.id]: e.target.value,
                        }))
                      }
                      disabled={
                        !order.bill_of_material ||
                        ["completed", "cancelled"].includes(order.status)
                      }
                      placeholder="Build qty"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => consumeBom(order)}
                      disabled={
                        !order.bill_of_material ||
                        ["completed", "cancelled"].includes(order.status)
                      }
                      className="rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Use BOM Materials
                    </button>
                    <p className="self-center text-xs text-gray-500">
                      Leave quantity blank to consume materials for the remaining planned quantity.
                    </p>
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
