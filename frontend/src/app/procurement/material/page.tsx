"use client";

import { useEffect, useState } from "react";
import AddMaterialForm, { Material } from "@/components/add-material-form";

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
        setIsManager(data.role === "procurement_manager");
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
        "http://127.0.0.1:8000/api/procurement/raw-materials/",
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
              Only procurement managers can create materials.
            </p>
          )
        )}
      </div>

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
