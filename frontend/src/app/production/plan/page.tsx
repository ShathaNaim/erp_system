"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product } from "@/components/product-creation-form";
import { apiUrl } from "@/lib/api-base";
import { getActionErrorMessage } from "@/lib/api";

type ProductionOrder = {
  id: number;
  order_number: string;
  sales_order_line: number | null;
  product: number;
  product_sku: string;
  product_name: string;
  planned_quantity: string;
  status: string;
  due_date: string | null;
};

type BillOfMaterial = {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  version: string;
  is_active: boolean;
};

type PaginatedResponse<T> = {
  count: number;
  results: T[];
};

const productsUrl = apiUrl("/api/production/finished-products/");
const bomsUrl = apiUrl("/api/production/bill-of-materials/");
const productionOrdersUrl =
  apiUrl("/api/production/production-orders/");

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getList<T>(data: T[] | PaginatedResponse<T>): T[] {
  return Array.isArray(data) ? data : data.results ?? [];
}

export default function PlanProductionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [boms, setBoms] = useState<BillOfMaterial[]>([]);
  const [plannedOrders, setPlannedOrders] = useState<ProductionOrder[]>([]);
  const [orderNumber, setOrderNumber] = useState("");
  const [productId, setProductId] = useState("");
  const [bomId, setBomId] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadPageData() {
      const headers = getAuthHeaders();
      const [productsRes, bomsRes, ordersRes] = await Promise.all([
        fetch(productsUrl, { headers }),
        fetch(bomsUrl, { headers }),
        fetch(productionOrdersUrl, { headers }),
      ]);

      if (!productsRes.ok || !bomsRes.ok || !ordersRes.ok) {
        alert("Failed to load production planning data");
        return;
      }

      const [productsData, bomsData, ordersData] = await Promise.all([
        productsRes.json() as Promise<Product[]>,
        bomsRes.json() as Promise<BillOfMaterial[]>,
        ordersRes.json() as Promise<
          ProductionOrder[] | PaginatedResponse<ProductionOrder>
        >,
      ]);

      setProducts(productsData);
      setBoms(bomsData);
      setPlannedOrders(
        getList(ordersData).filter((order) => order.sales_order_line === null)
      );
    }

    loadPageData();
  }, []);

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
        bill_of_material: bomId ? Number(bomId) : null,
        planned_quantity: Number(plannedQuantity),
        due_date: dueDate || null,
        notes,
      }),
    });

    if (!res.ok) {
      alert(getActionErrorMessage(res, "Failed to create production order"));
      return;
    }

    const savedOrder: ProductionOrder = await res.json();
    setPlannedOrders((current) => [savedOrder, ...current]);
    setOrderNumber("");
    setProductId("");
    setBomId("");
    setPlannedQuantity("");
    setDueDate("");
    setNotes("");
  }

  const productBoms = boms.filter(
    (bom) => bom.is_active && String(bom.product) === productId
  );

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link
          href="/production"
          className="inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          &larr; Back to Production
        </Link>

        <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-950">
            Plan Stock Production
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Create production orders for inventory without a sales order.
          </p>

          <form onSubmit={createStockProductionOrder} className="mt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
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
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setBomId("");
                  }}
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
                  Bill of Material
                </label>
                <select
                  value={bomId}
                  onChange={(e) => setBomId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">No BOM selected</option>
                  {productBoms.map((bom) => (
                    <option key={bom.id} value={bom.id}>
                      {bom.product_sku} v{bom.version}
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
              className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Create Production Order
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Recent Plans</h2>
          {plannedOrders.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No planned stock orders found.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-3 pr-4 font-medium">Order</th>
                    <th className="py-3 pr-4 font-medium">Product</th>
                    <th className="py-3 pr-4 font-medium">Quantity</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {plannedOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100">
                      <td className="py-3 pr-4 text-gray-900">
                        {order.order_number}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {order.product_sku} - {order.product_name}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {order.planned_quantity}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {order.status}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {order.due_date ?? "Not set"}
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
