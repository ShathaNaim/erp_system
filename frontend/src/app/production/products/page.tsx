"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProductCreationForm, {
  Product,
} from "@/components/product-creation-form";

const productsUrl = "http://127.0.0.1:8000/api/production/finished-products/";

export default function ProductionProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(productsUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          alert("Failed to load products");
          return;
        }

        const data: Product[] = await res.json();
        setProducts(data);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link
          href="/production"
          className="inline-block text-sm font-semibold text-emerald-700 hover:underline"
        >
          &larr; Back to Production
        </Link>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="mb-5 text-2xl font-bold text-gray-950">
              Add Finished Product
            </h1>
            <ProductCreationForm
              onCreated={(product) =>
                setProducts((current) => [...current, product])
              }
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-950">
                Product List
              </h2>
              <p className="text-sm text-gray-500">
                {loading ? "Loading..." : `${products.length} products`}
              </p>
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
