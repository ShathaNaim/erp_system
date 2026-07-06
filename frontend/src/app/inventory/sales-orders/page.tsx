"use client";

import Link from "next/link";
import { useState } from "react";

type InventoryCheck = {
  product_id: number;
  sku: string;
  product_name: string;
  product_type: string;
  required_quantity: string;
  available_quantity: string;
  shortage_quantity: string;
  route: "inventory" | "production";
};

type SalesOrderInventoryCheck = InventoryCheck & {
  sales_order_line_id: number;
};

const inventoryApi = "http://127.0.0.1:8000/api/inventory";
const productionOrdersApi =
  "http://127.0.0.1:8000/api/production/production-orders/";

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatQuantity(value: string | number) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

function RouteBadge({ route }: { route: InventoryCheck["route"] }) {
  const className =
    route === "inventory"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {route === "inventory" ? "Inventory" : "Production"}
    </span>
  );
}

export default function InventorySalesOrdersPage() {
  const [salesOrderId, setSalesOrderId] = useState("");
  const [salesOrderCheck, setSalesOrderCheck] = useState<
    SalesOrderInventoryCheck[]
  >([]);
  const [checking, setChecking] = useState(false);
  const [shipping, setShipping] = useState(false);
  const [orderingShortageKey, setOrderingShortageKey] = useState<string | null>(
    null
  );
  const [orderedShortages, setOrderedShortages] = useState<
    Record<string, string>
  >({});
  const [shippedSalesOrder, setShippedSalesOrder] = useState<string | null>(
    null
  );

  const canShip =
    salesOrderCheck.length > 0 &&
    salesOrderCheck.every((line) => Number(line.shortage_quantity) <= 0);

  async function checkSalesOrderStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setChecking(true);

    try {
      const res = await fetch(`${inventoryApi}/sales-orders/${salesOrderId}/check/`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        alert("Failed to check sales order inventory");
        return;
      }

      const data: SalesOrderInventoryCheck[] = await res.json();
      setSalesOrderCheck(data);
      setShippedSalesOrder(null);
      setOrderedShortages({});
    } finally {
      setChecking(false);
    }
  }

  async function orderShortageFromProduction(line: SalesOrderInventoryCheck) {
    const shortageQuantity = Number(line.shortage_quantity);
    if (shortageQuantity <= 0) return;

    const key = `line-${line.sales_order_line_id}`;
    setOrderingShortageKey(key);

    try {
      const res = await fetch(productionOrdersApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          order_number: `PROD-SO-${line.sales_order_line_id}-${Date.now()}`,
          sales_order_line: line.sales_order_line_id,
          product: line.product_id,
          planned_quantity: shortageQuantity,
          notes: `Created by inventory for sales order line ${line.sales_order_line_id}.`,
        }),
      });

      if (!res.ok) {
        alert("Failed to create production order");
        return;
      }

      const createdOrder: { order_number: string } = await res.json();
      setOrderedShortages((current) => ({
        ...current,
        [key]: createdOrder.order_number,
      }));
    } finally {
      setOrderingShortageKey(null);
    }
  }

  async function shipSalesOrder() {
    if (!salesOrderId) return;

    setShipping(true);

    try {
      const res = await fetch(`${inventoryApi}/sales-orders/${salesOrderId}/ship/`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        alert(error?.detail ?? "Failed to ship sales order");
        return;
      }

      const shippedOrder: { order_number: string; status: string } =
        await res.json();
      setShippedSalesOrder(
        `${shippedOrder.order_number} marked as ${shippedOrder.status}`
      );
      setSalesOrderCheck([]);
    } finally {
      setShipping(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/inventory"
          className="mb-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          &larr; Back to Inventory
        </Link>

        <form
          onSubmit={checkSalesOrderStock}
          className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
        >
          <h1 className="text-2xl font-bold text-gray-950">
            Sales Order Fulfillment
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Check stock for a sales order, request production for shortages,
            and ship when ready.
          </p>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Sales Order ID
              </label>
              <input
                type="number"
                min="1"
                value={salesOrderId}
                onChange={(e) => setSalesOrderId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={checking}
                className="w-full rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {checking ? "Checking..." : "Check Order"}
              </button>
            </div>
          </div>

          {salesOrderCheck.length > 0 && (
            <div className="mt-6 space-y-3">
              {salesOrderCheck.map((line) => (
                <div
                  key={line.sales_order_line_id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {line.sku} - {line.product_name}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Line #{line.sales_order_line_id}
                      </p>
                    </div>
                    <RouteBadge route={line.route} />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
                    <p>Required: {formatQuantity(line.required_quantity)}</p>
                    <p>Available: {formatQuantity(line.available_quantity)}</p>
                    <p>Shortage: {formatQuantity(line.shortage_quantity)}</p>
                  </div>

                  {Number(line.shortage_quantity) > 0 && (
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        onClick={() => orderShortageFromProduction(line)}
                        disabled={
                          orderingShortageKey ===
                            `line-${line.sales_order_line_id}` ||
                          Boolean(
                            orderedShortages[`line-${line.sales_order_line_id}`]
                          )
                        }
                        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {orderingShortageKey ===
                        `line-${line.sales_order_line_id}`
                          ? "Ordering..."
                          : "Create Production Order"}
                      </button>
                      {orderedShortages[`line-${line.sales_order_line_id}`] && (
                        <p className="text-sm text-emerald-700">
                          Created{" "}
                          {orderedShortages[`line-${line.sales_order_line_id}`]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Shipment
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {canShip
                        ? "All checked lines are available and ready to ship."
                        : "Resolve shortages before shipping this order."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={shipSalesOrder}
                    disabled={!canShip || shipping}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {shipping ? "Shipping..." : "Ship Order"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {shippedSalesOrder && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {shippedSalesOrder}
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
