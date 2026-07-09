"use client";

import { useEffect, useState } from "react";
import AddMaterialForm, { Material } from "@/components/add-material-form";
import { showConfirm } from "@/components/AppNotifications";
import { apiUrl } from "@/lib/api-base";

type CurrentUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  department: string;
};

export default function MaterialPage() {
  const [isManager, setIsManager] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editForm, setEditForm] = useState({
    sku: "",
    name: "",
    description: "",
    unit: "",
    standard_cost: "",
    reorder_level: "",
    is_active: true,
  });

  useEffect(() => {
    async function loadCurrentUser() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setLoadingUser(false);
        return;
      }

      try {
        const res = await fetch(apiUrl("/api/accounts/me/"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data: CurrentUser = await res.json();
        setUser(data);
        setIsManager(
          data.role === "admin" || data.role === "procurement_manager"
        );
      } finally {
        setLoadingUser(false);
      }
    }

    loadCurrentUser();
  }, []);

  useEffect(() => {
    async function loadMaterials() {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const res = await fetch(
        apiUrl("/api/procurement/raw-materials/"),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        alert("Failed to load materials");
        return;
      }

      const data: Material[] = await res.json();
      setMaterials(data);
    }

    loadMaterials();
  }, []);

  function startEditingMaterial(material: Material) {
    setEditingMaterial(material);
    setEditForm({
      sku: material.sku,
      name: material.name,
      description: material.description,
      unit: material.unit,
      standard_cost: String(material.standard_cost),
      reorder_level: String(material.reorder_level),
      is_active: material.is_active,
    });
  }

  async function updateMaterial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingMaterial) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch(
      apiUrl(`/api/procurement/raw-materials/${editingMaterial.id}/`),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editForm,
          standard_cost: Number(editForm.standard_cost),
          reorder_level: Number(editForm.reorder_level),
        }),
      }
    );

    if (!res.ok) {
      alert("Failed to update material");
      return;
    }

    const updatedMaterial: Material = await res.json();
    setMaterials((current) =>
      current.map((material) =>
        material.id === updatedMaterial.id ? updatedMaterial : material
      )
    );
    setEditingMaterial(null);
  }

  async function deleteMaterial(material: Material) {
    const confirmed = await showConfirm(`Delete material "${material.name}"?`);
    if (!confirmed) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch(
      apiUrl(`/api/procurement/raw-materials/${material.id}/`),
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      alert(error?.detail ?? "Failed to delete material");
      return;
    }

    setMaterials((current) =>
      current.filter((item) => item.id !== material.id)
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Add Material</h1>
        {loadingUser ? (
          <p className="mb-4 text-sm text-gray-500">Loading user...</p>
        ) : user ? (
          <p className="mb-4 text-sm text-gray-500">
            Logged in as {user.username} ({user.role})
          </p>
        ) : (
          <p className="mb-4 text-sm text-red-600">User info not available.</p>
        )}

        {isManager ? (
          <AddMaterialForm
            onCreated={(material) =>
              setMaterials((current) => [...current, material])
            }
          />
        ) : (
          !loadingUser && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Only admins and procurement managers can create materials.
            </p>
          )
        )}
      </div>

      {editingMaterial && (
        <section className="mx-auto mt-10 max-w-3xl rounded-lg bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900">Edit Material</h2>
            <button
              type="button"
              onClick={() => setEditingMaterial(null)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={updateMaterial} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {(["sku", "name", "unit", "standard_cost", "reorder_level"] as const).map(
                (field) => (
                  <input
                    key={field}
                    type={
                      ["standard_cost", "reorder_level"].includes(field)
                        ? "number"
                        : "text"
                    }
                    min={
                      ["standard_cost", "reorder_level"].includes(field)
                        ? "0"
                        : undefined
                    }
                    step={
                      field === "standard_cost"
                        ? "0.01"
                        : field === "reorder_level"
                          ? "0.001"
                          : undefined
                    }
                    value={editForm[field]}
                    onChange={(e) =>
                      setEditForm((current) => ({
                        ...current,
                        [field]: e.target.value,
                      }))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2"
                    placeholder={field.replace("_", " ")}
                    required={field !== "unit" ? true : undefined}
                  />
                )
              )}
            </div>
            <textarea
              value={editForm.description}
              onChange={(e) =>
                setEditForm((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Description"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) =>
                  setEditForm((current) => ({
                    ...current,
                    is_active: e.target.checked,
                  }))
                }
              />
              Active material
            </label>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700"
            >
              Save Changes
            </button>
          </form>
        </section>
      )}

      <section className="mx-auto mt-10 max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-gray-900">Material List</h2>
        {materials.length === 0 ? (
          <p className="text-sm text-gray-500">No materials found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-3 pr-4 font-medium">SKU</th>
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Unit</th>
                  <th className="py-3 pr-4 font-medium">Standard Cost</th>
                  <th className="py-3 pr-4 font-medium">Reorder Level</th>
                  <th className="py-3 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={material.id} className="border-b border-gray-100">
                    <td className="py-3 pr-4 text-gray-900">{material.sku}</td>
                    <td className="py-3 pr-4 text-gray-900">{material.name}</td>
                    <td className="py-3 pr-4 text-gray-700">{material.unit}</td>
                    <td className="py-3 pr-4 text-gray-700">
                      {material.standard_cost}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {material.reorder_level}
                    </td>
                    <td className="py-3 pr-4">
                      <div className=" grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingMaterial(material)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMaterial(material)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
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
