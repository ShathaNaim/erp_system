"use client";

import { useEffect, useMemo, useState } from "react";

type FinishedProductStock = {
  id: number;
  sku: string;
  name: string;
  product_type: "standard" | "custom";
  unit: string;
  available_quantity: string;
};

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
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });
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

export default function InventoryPage() {
  const [products, setProducts] = useState<FinishedProductStock[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [productCheck, setProductCheck] = useState<InventoryCheck | null>(null);
  const [checkingProduct, setCheckingProduct] = useState(false);
  const [salesOrderId, setSalesOrderId] = useState("");
  const [salesOrderCheck, setSalesOrderCheck] = useState<
    SalesOrderInventoryCheck[]
  >([]);
  const [checkingSalesOrder, setCheckingSalesOrder] = useState(false);
  const [orderingShortageKey, setOrderingShortageKey] = useState<string | null>(
    null
  );
  const [orderedShortages, setOrderedShortages] = useState<
    Record<string, string>
  >({});
  const [shippingSalesOrder, setShippingSalesOrder] = useState(false);
  const [shippedSalesOrder, setShippedSalesOrder] = useState<string | null>(
    null
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === Number(productId)),
    [productId, products]
  );
  const canShipSalesOrder =
    salesOrderCheck.length > 0 &&
    salesOrderCheck.every((line) => Number(line.shortage_quantity) <= 0);

  async function loadProducts() {
    try {
      const res = await fetch(`${inventoryApi}/finished-products/`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        alert("Failed to load inventory products");
        return;
      }

      const data: FinishedProductStock[] = await res.json();
      setProducts(data);
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function checkProductStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCheckingProduct(true);

    try {
      const res = await fetch(`${inventoryApi}/finished-products/check/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          product: Number(productId),
          quantity: Number(quantity),
        }),
      });

      if (!res.ok) {
        alert("Failed to check product stock");
        return;
      }

      const data: InventoryCheck = await res.json();
      setProductCheck(data);
    } finally {
      setCheckingProduct(false);
    }
  }

  async function checkSalesOrderStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCheckingSalesOrder(true);

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
    } finally {
      setCheckingSalesOrder(false);
    }
  }

  async function shipSalesOrder() {
    if (!salesOrderId) return;

    setShippingSalesOrder(true);

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
      await loadProducts();
    } finally {
      setShippingSalesOrder(false);
    }
  }

  function buildProductionOrderNumber(
    check: InventoryCheck,
    salesOrderLineId?: number
  ) {
    const timestamp = Date.now();

    if (salesOrderLineId) {
      return `PROD-SO-${salesOrderLineId}-${timestamp}`;
    }

    return `PROD-INV-${check.product_id}-${timestamp}`;
  }

  async function orderShortageFromProduction(
    check: InventoryCheck,
    salesOrderLineId?: number
  ) {
    const shortageQuantity = Number(check.shortage_quantity);

    if (shortageQuantity <= 0) {
      alert("There is no shortage to order from production");
      return;
    }

    const key = salesOrderLineId
      ? `line-${salesOrderLineId}`
      : `product-${check.product_id}`;

    setOrderingShortageKey(key);

    try {
      const res = await fetch(productionOrdersApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          order_number: buildProductionOrderNumber(check, salesOrderLineId),
          sales_order_line: salesOrderLineId ?? null,
          product: check.product_id,
          planned_quantity: shortageQuantity,
          notes: salesOrderLineId
            ? `Created by inventory for sales order line ${salesOrderLineId}.`
            : "Created by inventory to replenish shortage.",
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
      alert(`Production order ${createdOrder.order_number} was created`);
    } finally {
      setOrderingShortageKey(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="mt-2 text-sm text-gray-600">
            Check stock availability and see whether sales demand can be handled
            by inventory or needs production.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={checkProductStock}
            className="rounded-lg bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-gray-900">
              Check Product Stock
            </h2>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Product
                </label>
                <select
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setProductCheck(null);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Required Quantity
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setProductCheck(null);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              {selectedProduct && (
                <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Current stock:{" "}
                  <span className="font-semibold text-gray-900">
                    {formatQuantity(selectedProduct.available_quantity)}{" "}
                    {selectedProduct.unit}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={checkingProduct}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkingProduct ? "Checking..." : "Check Stock"}
              </button>
            </div>

            {productCheck && (
              <div className="mt-6 rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {productCheck.sku} - {productCheck.product_name}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Required {formatQuantity(productCheck.required_quantity)},
                      available{" "}
                      {formatQuantity(productCheck.available_quantity)}
                    </p>
                  </div>
                  <RouteBadge route={productCheck.route} />
                </div>
                <p className="mt-4 text-sm text-gray-700">
                  Shortage:{" "}
                  <span className="font-semibold text-gray-900">
                    {formatQuantity(productCheck.shortage_quantity)}
                  </span>
                </p>
                {Number(productCheck.shortage_quantity) > 0 && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => orderShortageFromProduction(productCheck)}
                      disabled={
                        orderingShortageKey ===
                          `product-${productCheck.product_id}` ||
                        Boolean(orderedShortages[`product-${productCheck.product_id}`])
                      }
                      className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {orderingShortageKey ===
                      `product-${productCheck.product_id}`
                        ? "Ordering..."
                        : "Order Shortage From Production"}
                    </button>
                    {orderedShortages[`product-${productCheck.product_id}`] && (
                      <p className="text-sm text-emerald-700">
                        Created{" "}
                        {orderedShortages[`product-${productCheck.product_id}`]}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </form>

          <form
            onSubmit={checkSalesOrderStock}
            className="rounded-lg bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-gray-900">
              Check Sales Order
            </h2>

            <div className="mt-5 flex flex-col gap-4 sm:flex-row">
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
                  disabled={checkingSalesOrder}
                  className="w-full rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {checkingSalesOrder ? "Checking..." : "Check Order"}
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
                          onClick={() =>
                            orderShortageFromProduction(
                              line,
                              line.sales_order_line_id
                            )
                          }
                          disabled={
                            orderingShortageKey ===
                              `line-${line.sales_order_line_id}` ||
                            Boolean(
                              orderedShortages[
                                `line-${line.sales_order_line_id}`
                              ]
                            )
                          }
                          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {orderingShortageKey ===
                          `line-${line.sales_order_line_id}`
                            ? "Ordering..."
                            : "Create Production Order"}
                        </button>
                        {orderedShortages[
                          `line-${line.sales_order_line_id}`
                        ] && (
                          <p className="text-sm text-emerald-700">
                            Created{" "}
                            {
                              orderedShortages[
                                `line-${line.sales_order_line_id}`
                              ]
                            }
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
                        {canShipSalesOrder
                          ? "All checked lines are available and ready to ship."
                          : "Resolve shortages before shipping this order."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={shipSalesOrder}
                      disabled={!canShipSalesOrder || shippingSalesOrder}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {shippingSalesOrder ? "Shipping..." : "Ship Order"}
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
        </section>

        <section className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900">Finished Stock</h2>
            <p className="text-sm text-gray-500">
              {loadingProducts ? "Loading..." : `${products.length} products`}
            </p>
          </div>

          {products.length === 0 ? (
            <p className="text-sm text-gray-500">No finished products found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-3 pr-4 font-medium">SKU</th>
                    <th className="py-3 pr-4 font-medium">Product</th>
                    <th className="py-3 pr-4 font-medium">Type</th>
                    <th className="py-3 pr-4 font-medium">Available</th>
                    <th className="py-3 pr-4 font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100">
                      <td className="py-3 pr-4 font-semibold text-gray-900">
                        {product.sku}
                      </td>
                      <td className="py-3 pr-4 text-gray-900">
                        {product.name}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {product.product_type}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {formatQuantity(product.available_quantity)}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {product.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
