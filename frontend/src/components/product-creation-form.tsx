"use client";

import { useState } from "react";

export type Product = {
  id: number;
  sku: string;
  name: string;
  description: string;
  product_type: "standard" | "custom";
  unit: string;
  selling_price: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductCreationFormProps = {
  onCreated?: (product: Product) => void;
};

export default function ProductCreationForm({
  onCreated,
}: ProductCreationFormProps) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("piece");
  const [sellingPrice, setSellingPrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("You must be logged in to create products");
      return;
    }

    const res = await fetch(
      "http://127.0.0.1:8000/api/production/finished-products/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sku,
          name,
          description,
          product_type: "standard",
          unit,
          selling_price: Number(sellingPrice),
          is_active: isActive,
        }),
      }
    );

    if (res.status === 403) {
      alert("You do not have permission to create products");
      return;
    }

    if (!res.ok) {
      alert("Failed to save product");
      return;
    }

    const savedProduct: Product = await res.json();
    onCreated?.(savedProduct);

    setSku("");
    setName("");
    setDescription("");
    setUnit("piece");
    setSellingPrice("");
    setIsActive(true);
    alert("Product saved successfully");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          SKU
        </label>
        <input
          type="text"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Product Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Unit
        </label>
        <input
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Selling Price
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={sellingPrice}
          onChange={(e) => setSellingPrice(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          required
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Active product
      </label>

      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700"
      >
        Save Product
      </button>
    </form>
  );
}
