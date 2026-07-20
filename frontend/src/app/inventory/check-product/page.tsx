"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "@/lib/api-base";
import { getActionErrorMessage } from "@/lib/api";

type FinishedProductStock = {
  id: number;
  sku: string;
  name: string;
  product_type: "standard" | "custom";
  unit: string;
  available_quantity: string;
};

type RawMaterialStock = {
  id: number;
  sku: string;
  name: string;
  unit: string;
  reorder_level: string;
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

type CheckMode = "product" | "material";

const inventoryApi = apiUrl("/api/inventory");
const productionOrdersApi =
  apiUrl("/api/production/production-orders/");

function getAuthHeaders(): Record<string, string> {
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

export default function CheckProductPage() {
  const [mode, setMode] = useState<CheckMode>("product");
  const [products, setProducts] = useState<FinishedProductStock[]>([]);
  const [materials, setMaterials] = useState<RawMaterialStock[]>([]);
  const [productId, setProductId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [productCheck, setProductCheck] = useState<InventoryCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(
    null
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === Number(productId)),
    [productId, products]
  );

  const selectedMaterial = useMemo(
    () => materials.find((material) => material.id === Number(materialId)),
    [materialId, materials]
  );

  const materialCheck = useMemo(() => {
    if (!selectedMaterial || !quantity) return null;

    const requiredQuantity = Number(quantity);
    const availableQuantity = Number(selectedMaterial.available_quantity);
    const shortageQuantity = Math.max(requiredQuantity - availableQuantity, 0);

    return {
      material: selectedMaterial,
      requiredQuantity,
      availableQuantity,
      shortageQuantity,
      isLowStock:
        availableQuantity <= Number(selectedMaterial.reorder_level),
    };
  }, [quantity, selectedMaterial]);

  useEffect(() => {
    async function loadStockItems() {
      const [productsRes, materialsRes] = await Promise.all([
        fetch(`${inventoryApi}/finished-products/`, {
          headers: getAuthHeaders(),
        }),
        fetch(`${inventoryApi}/raw-materials/`, {
          headers: getAuthHeaders(),
        }),
      ]);

      if (!productsRes.ok || !materialsRes.ok) {
        alert("Failed to load inventory items");
        return;
      }

      const [productsData, materialsData] = await Promise.all([
        productsRes.json() as Promise<FinishedProductStock[]>,
        materialsRes.json() as Promise<RawMaterialStock[]>,
      ]);
      setProducts(productsData);
      setMaterials(materialsData);
    }

    loadStockItems();
  }, []);

  async function checkStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (mode === "material") {
      setProductCheck(null);
      return;
    }

    setChecking(true);
    setCreatedOrderNumber(null);

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
      setChecking(false);
    }
  }

  async function orderShortageFromProduction() {
    if (!productCheck || Number(productCheck.shortage_quantity) <= 0) return;
    setOrdering(true);

    try {
      const res = await fetch(productionOrdersApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          order_number: `PROD-INV-${productCheck.product_id}-${Date.now()}`,
          sales_order_line: null,
          product: productCheck.product_id,
          planned_quantity: Number(productCheck.shortage_quantity),
          notes: "Created by inventory to replenish shortage.",
        }),
      });

      if (!res.ok) {
        alert(getActionErrorMessage(res, "Failed to create production order"));
        return;
      }

      const createdOrder: { order_number: string } = await res.json();
      setCreatedOrderNumber(createdOrder.order_number);
    } finally {
      setOrdering(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/inventory"
          className="mb-4 inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          &larr; Back to Inventory
        </Link>

        <form
          onSubmit={checkStock}
          className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
        >
          <h1 className="text-2xl font-bold text-gray-950">
            Check Product or Material Stock
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Check finished product availability for demand or raw material
            availability for production.
          </p>

          <div className="mt-6 space-y-4">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              {(["product", "material"] as CheckMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setMode(item);
                    setProductCheck(null);
                    setCreatedOrderNumber(null);
                    setQuantity("");
                  }}
                  className={`rounded-md px-4 py-2 text-sm font-semibold capitalize transition ${
                    mode === item
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-gray-600 hover:text-gray-950"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {mode === "product" ? "Product" : "Raw Material"}
              </label>
              {mode === "product" ? (
                <select
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setProductCheck(null);
                    setCreatedOrderNumber(null);
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
              ) : (
                <select
                  value={materialId}
                  onChange={(e) => {
                    setMaterialId(e.target.value);
                    setProductCheck(null);
                    setCreatedOrderNumber(null);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select raw material</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.sku} - {material.name}
                    </option>
                  ))}
                </select>
              )}
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
                  setCreatedOrderNumber(null);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>

            {mode === "product" && selectedProduct && (
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                Current stock:{" "}
                <span className="font-semibold text-gray-900">
                  {formatQuantity(selectedProduct.available_quantity)}{" "}
                  {selectedProduct.unit}
                </span>
              </div>
            )}

            {mode === "material" && selectedMaterial && (
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
                Current stock:{" "}
                <span className="font-semibold text-gray-900">
                  {formatQuantity(selectedMaterial.available_quantity)}{" "}
                  {selectedMaterial.unit}
                </span>
                <span className="ml-2 text-gray-500">
                  Reorder level:{" "}
                  {formatQuantity(selectedMaterial.reorder_level)}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={checking}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checking ? "Checking..." : "Check Stock"}
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
                    available {formatQuantity(productCheck.available_quantity)}
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
                    onClick={orderShortageFromProduction}
                    disabled={ordering || Boolean(createdOrderNumber)}
                    className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {ordering
                      ? "Ordering..."
                      : "Order Shortage From Production"}
                  </button>
                  {createdOrderNumber && (
                    <p className="text-sm text-emerald-700">
                      Created {createdOrderNumber}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === "material" && materialCheck && (
            <div className="mt-6 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">
                    {materialCheck.material.sku} -{" "}
                    {materialCheck.material.name}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Required {formatQuantity(materialCheck.requiredQuantity)},
                    available {formatQuantity(materialCheck.availableQuantity)}{" "}
                    {materialCheck.material.unit}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    materialCheck.shortageQuantity > 0
                      ? "bg-red-50 text-red-700"
                      : materialCheck.isLowStock
                        ? "bg-amber-50 text-amber-700"
                        : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {materialCheck.shortageQuantity > 0
                    ? "Shortage"
                    : materialCheck.isLowStock
                      ? "Low Stock"
                      : "Available"}
                </span>
              </div>
              <p className="mt-4 text-sm text-gray-700">
                Shortage:{" "}
                <span className="font-semibold text-gray-900">
                  {formatQuantity(materialCheck.shortageQuantity)}{" "}
                  {materialCheck.material.unit}
                </span>
              </p>
              {materialCheck.shortageQuantity > 0 && (
                <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  This material needs procurement before production can consume
                  the requested quantity.
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
