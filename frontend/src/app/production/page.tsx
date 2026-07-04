"use client";

import { useEffect, useState } from "react";
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

const productsUrl = "http://127.0.0.1:8000/api/production/finished-products/";

export default function ProductionPage() {
  const [isProductionUser, setIsProductionUser] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

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
    async function loadProducts() {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const res = await fetch(productsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        alert("Failed to load products");
        return;
      }

      const data: Product[] = await res.json();
      setProducts(data);
    }

    loadProducts();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Add Finished Product
        </h1>
        {loadingUser ? (
          <p className="mb-4 text-sm text-gray-500">Loading user...</p>
        ) : user ? (
          <p className="mb-4 text-sm text-gray-500">
            Logged in as {user.username} ({user.role})
          </p>
        ) : (
          <p className="mb-4 text-sm text-red-600">User info not available.</p>
        )}

        {isProductionUser ? (
          <ProductCreationForm
            onCreated={(product) =>
              setProducts((current) => [...current, product])
            }
          />
        ) : (
          !loadingUser && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Only production users can create products.
            </p>
          )
        )}
      </div>

      <section className="mx-auto mt-10 max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-gray-900">Product List</h2>
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
                    <td className="py-3 pr-4 text-gray-900">{product.sku}</td>
                    <td className="py-3 pr-4 text-gray-900">{product.name}</td>
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
      </section>
    </main>
  );
}
