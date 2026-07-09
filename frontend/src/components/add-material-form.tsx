"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api-base";

export type Material = {
  id: number;
  sku: string;
  name: string;
  description: string;
  unit: string;
  standard_cost: number;
  reorder_level: number;
  is_active: boolean;
};

type AddMaterialFormProps = {
  onCreated?: (material: Material) => void;
};

export default function AddMaterialForm({
  onCreated,
}: AddMaterialFormProps) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");
  const [standardCost, setStandardCost] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [isActive, setIsActive] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const token = localStorage.getItem("access_token");

    if (!token) {
      alert("You must be logged in to create materials");
      return;
    }

    const res = await fetch(
      apiUrl("/api/procurement/raw-materials/"),
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
          unit,
          standard_cost: Number(standardCost),
          reorder_level: Number(reorderLevel),
          is_active: isActive,
        }),
      }
    );

    if (res.status === 403) {
      alert("You do not have permission to create materials");
      return;
    }

    if (!res.ok) {
      alert("Failed to save material");
      return;
    }

    const savedMaterial: Material = await res.json();
    onCreated?.(savedMaterial);

    setSku("");
    setName("");
    setDescription("");
    setUnit("");
    setStandardCost("");
    setReorderLevel("");
    setIsActive(true);

    alert("Material saved successfully");
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
          Name
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
          Standard Cost
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={standardCost}
          onChange={(e) => setStandardCost(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Reorder Level
        </label>
        <input
          type="number"
          min="0"
          step="0.001"
          value={reorderLevel}
          onChange={(e) => setReorderLevel(e.target.value)}
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
        Active material
      </label>

      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700"
      >
        Save Material
      </button>
    </form>
  );
}
