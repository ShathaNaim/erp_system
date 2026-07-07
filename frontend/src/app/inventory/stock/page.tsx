"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const inventoryApi = "http://127.0.0.1:8000/api/inventory";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatQuantity(value: string | number) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 3 });
}

export default function InventoryStockPage() {
  const [products, setProducts] = useState<FinishedProductStock[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStock() {
      try {
        const headers = getAuthHeaders();
        const [productsRes, rawMaterialsRes] = await Promise.all([
          fetch(`${inventoryApi}/finished-products/`, { headers }),
          fetch(`${inventoryApi}/raw-materials/`, { headers }),
        ]);

        if (!productsRes.ok || !rawMaterialsRes.ok) {
          alert("Failed to load inventory stock");
          return;
        }

        const [productsData, rawMaterialsData] = await Promise.all([
          productsRes.json() as Promise<FinishedProductStock[]>,
          rawMaterialsRes.json() as Promise<RawMaterialStock[]>,
        ]);
        setProducts(productsData);
        setRawMaterials(rawMaterialsData);
      } finally {
        setLoading(false);
      }
    }

    loadStock();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link
          href="/inventory"
          className="inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          &larr; Back to Inventory
        </Link>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-950">
              Finished Stock
            </h1>
            <p className="text-sm text-gray-500">
              {loading ? "Loading..." : `${products.length} products`}
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

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-950">
              Raw Material Stock
            </h2>
            <p className="text-sm text-gray-500">
              {loading ? "Loading..." : `${rawMaterials.length} materials`}
            </p>
          </div>

          {rawMaterials.length === 0 ? (
            <p className="text-sm text-gray-500">No raw materials found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-3 pr-4 font-medium">SKU</th>
                    <th className="py-3 pr-4 font-medium">Material</th>
                    <th className="py-3 pr-4 font-medium">Available</th>
                    <th className="py-3 pr-4 font-medium">Reorder Level</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {rawMaterials.map((material) => {
                    const isLowStock =
                      Number(material.available_quantity) <=
                      Number(material.reorder_level);

                    return (
                      <tr key={material.id} className="border-b border-gray-100">
                        <td className="py-3 pr-4 font-semibold text-gray-900">
                          {material.sku}
                        </td>
                        <td className="py-3 pr-4 text-gray-900">
                          {material.name}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {formatQuantity(material.available_quantity)}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {formatQuantity(material.reorder_level)}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isLowStock
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {isLowStock ? "Low stock" : "Available"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {material.unit}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
