"use client";

import { useEffect, useMemo, useState } from "react";
import ProductCreationForm, {
  Product,
} from "@/components/product-creation-form";

type CurrentUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  department: string;
};

type ProductionOrder = {
  id: number;
  order_number: string;
  source: "sales" | "inventory";
  sales_order_line: number | null;
  sales_order_number: string | null;
  product: number;
  product_sku: string;
  product_name: string;
  bill_of_material: number | null;
  planned_quantity: string;
  produced_quantity: string;
  status: "planned" | "released" | "in_progress" | "completed" | "cancelled";
  due_date: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
};

const productionApi = "http://127.0.0.1:8000/api/production";
const productsUrl = `${productionApi}/finished-products/`;
const productionOrdersUrl = `${productionApi}/production-orders/`;

function getAuthHeaders() {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatQuantity(value: string | number) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });
}

function statusLabel(status: ProductionOrder["status"]) {
  return status.replace("_", " ");
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
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${colors[status]}`}
    >
      {statusLabel(status)}
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

export default function ProductionPage() {
  const [isProductionUser, setIsProductionUser] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>(
    []
  );
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orderNumber, setOrderNumber] = useState("");
  const [productId, setProductId] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [completeQuantities, setCompleteQuantities] = useState<
    Record<number, string>
  >({});
  const [materialInputs, setMaterialInputs] = useState<
    Record<number, { rawMaterialName: string; quantity: string }>
  >({});

  const openOrders = useMemo(
    () =>
      productionOrders.filter(
        (order) => order.status !== "completed" && order.status !== "cancelled"
      ),
    [productionOrders]
  );

  useEffect(() => {
    async function loadCurrentUser() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setLoadingUser(false);
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/api/accounts/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data: CurrentUser = await res.json();
        setUser(data);
        setIsProductionUser(
          data.department === "production" || data.role === "production_manager"
        );
      } finally {
        setLoadingUser(false);
      }
    }

    loadCurrentUser();
  }, []);

  useEffect(() => {
    async function loadProductionData() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setLoadingOrders(false);
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const [productsRes, ordersRes] = await Promise.all([
        fetch(productsUrl, { headers }),
        fetch(productionOrdersUrl, { headers }),
      ]);

      if (!productsRes.ok || !ordersRes.ok) {
        alert("Failed to load production data");
        setLoadingOrders(false);
        return;
      }

      const [productsData, ordersData] = await Promise.all([
        productsRes.json() as Promise<Product[]>,
        ordersRes.json() as Promise<ProductionOrder[]>,
      ]);

      setProducts(productsData);
      setProductionOrders(ordersData);
      setLoadingOrders(false);
    }

    loadProductionData();
  }, []);

  function updateProductionOrder(updatedOrder: ProductionOrder) {
    setProductionOrders((current) =>
      current.map((order) =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
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

    const updatedOrder: ProductionOrder = await res.json();
    updateProductionOrder(updatedOrder);
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
      body: JSON.stringify({
        produced_quantity: Number(producedQuantity),
      }),
    });

    if (!res.ok) {
      alert("Failed to complete production order");
      return;
    }

    const updatedOrder: ProductionOrder = await res.json();
    updateProductionOrder(updatedOrder);
    setCompleteQuantities((current) => ({ ...current, [order.id]: "" }));
  }

  async function consumeMaterial(order: ProductionOrder) {
    const materialInput = materialInputs[order.id];

    if (!materialInput?.rawMaterialName || !materialInput.quantity) {
      alert("Enter the raw material name and quantity first");
      return;
    }

    const res = await fetch(`${productionOrdersUrl}${order.id}/consume-material/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        raw_material_name: materialInput.rawMaterialName,
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
      [order.id]: { rawMaterialName: "", quantity: "" },
    }));
    alert("Raw material quantity was reduced");
  }

  async function createStockProductionOrder(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const res = await fetch(productionOrdersUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        order_number: orderNumber,
        product: Number(productId),
        planned_quantity: Number(plannedQuantity),
        due_date: dueDate || null,
        notes,
      }),
    });

    if (!res.ok) {
      alert("Failed to create production order");
      return;
    }

    const savedOrder: ProductionOrder = await res.json();
    setProductionOrders((current) => [savedOrder, ...current]);
    setOrderNumber("");
    setProductId("");
    setPlannedQuantity("");
    setDueDate("");
    setNotes("");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section>
          <h1 className="text-2xl font-bold text-gray-900">Production</h1>
          {loadingUser ? (
            <p className="mt-2 text-sm text-gray-500">Loading user...</p>
          ) : user ? (
            <p className="mt-2 text-sm text-gray-600">
              Logged in as {user.username} ({user.role})
            </p>
          ) : (
            <p className="mt-2 text-sm text-red-600">User info not available.</p>
          )}
        </section>

        {!isProductionUser && !loadingUser && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Only production users can manage products and production orders.
          </p>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Production Orders
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Orders can come from sales shortages or inventory stock plans.
                </p>
              </div>
              <p className="text-sm text-gray-500">
                {loadingOrders ? "Loading..." : `${openOrders.length} open`}
              </p>
            </div>

            {productionOrders.length === 0 ? (
              <p className="text-sm text-gray-500">
                No production orders found.
              </p>
            ) : (
              <div className="space-y-4">
                {productionOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {order.order_number}
                          </h3>
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
                        <p>
                          Planned:{" "}
                          <span className="font-semibold">
                            {formatQuantity(order.planned_quantity)}
                          </span>
                        </p>
                        <p>
                          Produced:{" "}
                          <span className="font-semibold">
                            {formatQuantity(order.produced_quantity)}
                          </span>
                        </p>
                        <p>Due: {order.due_date ?? "Not set"}</p>
                      </div>
                    </div>

                    {order.notes && (
                      <p className="mt-3 text-sm text-gray-500">
                        {order.notes}
                      </p>
                    )}

                    <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 lg:flex-row lg:items-center">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => runOrderAction(order, "release")}
                          disabled={
                            !isProductionUser ||
                            order.status !== "planned"
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Release
                        </button>
                        <button
                          type="button"
                          onClick={() => runOrderAction(order, "start")}
                          disabled={
                            !isProductionUser ||
                            !["planned", "released"].includes(order.status)
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Start
                        </button>
                        <button
                          type="button"
                          onClick={() => runOrderAction(order, "cancel")}
                          disabled={
                            !isProductionUser ||
                            ["completed", "cancelled"].includes(order.status)
                          }
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
                          disabled={
                            !isProductionUser ||
                            ["completed", "cancelled"].includes(order.status)
                          }
                          placeholder="Produced qty"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => completeOrder(order)}
                          disabled={
                            !isProductionUser ||
                            ["completed", "cancelled"].includes(order.status)
                          }
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Receive Output
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 sm:grid-cols-[1fr_160px_auto]">
                      <input
                        type="text"
                        value={materialInputs[order.id]?.rawMaterialName ?? ""}
                        onChange={(e) =>
                          setMaterialInputs((current) => ({
                            ...current,
                            [order.id]: {
                              rawMaterialName: e.target.value,
                              quantity: current[order.id]?.quantity ?? "",
                            },
                          }))
                        }
                        disabled={
                          !isProductionUser ||
                          ["completed", "cancelled"].includes(order.status)
                        }
                        placeholder="Raw material name or SKU"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={materialInputs[order.id]?.quantity ?? ""}
                        onChange={(e) =>
                          setMaterialInputs((current) => ({
                            ...current,
                            [order.id]: {
                              rawMaterialName:
                                current[order.id]?.rawMaterialName ?? "",
                              quantity: e.target.value,
                            },
                          }))
                        }
                        disabled={
                          !isProductionUser ||
                          ["completed", "cancelled"].includes(order.status)
                        }
                        placeholder="Used qty"
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => consumeMaterial(order)}
                        disabled={
                          !isProductionUser ||
                          ["completed", "cancelled"].includes(order.status)
                        }
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Use Material
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={createStockProductionOrder}
            className="rounded-lg bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-gray-900">
              Plan Stock Production
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Create production for inventory without a sales order.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Order Number
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Product
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select product</option>
                  {products
                    .filter((product) => product.is_active)
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} - {product.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Planned Quantity
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={plannedQuantity}
                  onChange={(e) => setPlannedQuantity(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={!isProductionUser}
                className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create Production Order
              </button>
            </div>
          </form>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              Add Finished Product
            </h2>
            {isProductionUser ? (
              <ProductCreationForm
                onCreated={(product) =>
                  setProducts((current) => [...current, product])
                }
              />
            ) : (
              <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Only production users can create products.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-900">Product List</h2>
              <p className="text-sm text-gray-500">{products.length} products</p>
            </div>

            {products.length === 0 ? (
              <p className="text-sm text-gray-500">No products found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-600">
                      <th className="py-3 pr-4 font-medium">SKU</th>
                      <th className="py-3 pr-4 font-medium">Name</th>
                      <th className="py-3 pr-4 font-medium">Type</th>
                      <th className="py-3 pr-4 font-medium">Unit</th>
                      <th className="py-3 pr-4 font-medium">Price</th>
                      <th className="py-3 pr-4 font-medium">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b border-gray-100">
                        <td className="py-3 pr-4 text-gray-900">
                          {product.sku}
                        </td>
                        <td className="py-3 pr-4 text-gray-900">
                          {product.name}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {product.product_type}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {product.unit}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {product.selling_price}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {product.is_active ? "Yes" : "No"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
