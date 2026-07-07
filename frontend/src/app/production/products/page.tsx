"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ProductCreationForm, {
  Product,
} from "@/components/product-creation-form";

const productsUrl = "http://127.0.0.1:8000/api/production/finished-products/";
const bomsUrl = "http://127.0.0.1:8000/api/production/bill-of-materials/";
const rawMaterialsUrl = "http://127.0.0.1:8000/api/inventory/raw-materials/";

type RawMaterial = {
  id: number;
  sku: string;
  name: string;
  unit: string;
};

type BomLineInput = {
  raw_material: string;
  quantity_per_unit: string;
  scrap_percent: string;
};

type BillOfMaterial = {
  id: number;
  product: number;
  product_sku: string;
  product_name: string;
  version: string;
  is_active: boolean;
  lines: {
    id: number;
    raw_material_name: string;
    raw_material_sku: string;
    quantity_per_unit: string;
    scrap_percent: string;
  }[];
};

const emptyBomLine: BomLineInput = {
  raw_material: "",
  quantity_per_unit: "",
  scrap_percent: "0",
};

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ProductionProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [boms, setBoms] = useState<BillOfMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [bomProductId, setBomProductId] = useState("");
  const [bomVersion, setBomVersion] = useState("1");
  const [bomNotes, setBomNotes] = useState("");
  const [bomLines, setBomLines] = useState<BomLineInput[]>([
    { ...emptyBomLine },
  ]);

  useEffect(() => {
    async function loadProducts() {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [productsRes, rawMaterialsRes, bomsRes] = await Promise.all([
          fetch(productsUrl, { headers }),
          fetch(rawMaterialsUrl, { headers }),
          fetch(bomsUrl, { headers }),
        ]);

        if (!productsRes.ok || !rawMaterialsRes.ok || !bomsRes.ok) {
          alert("Failed to load production setup data");
          return;
        }

        const [productsData, rawMaterialsData, bomsData] = await Promise.all([
          productsRes.json() as Promise<Product[]>,
          rawMaterialsRes.json() as Promise<RawMaterial[]>,
          bomsRes.json() as Promise<BillOfMaterial[]>,
        ]);
        setProducts(productsData);
        setRawMaterials(rawMaterialsData);
        setBoms(bomsData);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  function updateBomLine(
    index: number,
    field: keyof BomLineInput,
    value: string
  ) {
    setBomLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line
      )
    );
  }

  async function createBom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validLines = bomLines.filter(
      (line) => line.raw_material && line.quantity_per_unit
    );

    if (validLines.length === 0) {
      alert("Add at least one raw material line");
      return;
    }

    const res = await fetch(bomsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        product: Number(bomProductId),
        version: bomVersion,
        is_active: true,
        notes: bomNotes,
        lines: validLines.map((line) => ({
          raw_material: Number(line.raw_material),
          quantity_per_unit: Number(line.quantity_per_unit),
          scrap_percent: Number(line.scrap_percent || 0),
        })),
      }),
    });

    if (!res.ok) {
      alert("Failed to save bill of material");
      return;
    }

    const savedBom: BillOfMaterial = await res.json();
    setBoms((current) => [...current, savedBom]);
    setBomProductId("");
    setBomVersion("1");
    setBomNotes("");
    setBomLines([{ ...emptyBomLine }]);
  }

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

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-950">
              Add Bill of Material
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Define the raw materials needed to produce one unit.
            </p>

            <form onSubmit={createBom} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-[1fr_100px]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Product
                  </label>
                  <select
                    value={bomProductId}
                    onChange={(e) => setBomProductId(e.target.value)}
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
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Version
                  </label>
                  <input
                    type="text"
                    value={bomVersion}
                    onChange={(e) => setBomVersion(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                {bomLines.map((line, index) => (
                  <div
                    key={index}
                    className="grid gap-2 md:grid-cols-[1fr_130px_120px]"
                  >
                    <select
                      value={line.raw_material}
                      onChange={(e) =>
                        updateBomLine(index, "raw_material", e.target.value)
                      }
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Raw material</option>
                      {rawMaterials.map((material) => (
                        <option key={material.id} value={material.id}>
                          {material.sku} - {material.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={line.quantity_per_unit}
                      onChange={(e) =>
                        updateBomLine(
                          index,
                          "quantity_per_unit",
                          e.target.value
                        )
                      }
                      placeholder="Qty/unit"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.scrap_percent}
                      onChange={(e) =>
                        updateBomLine(index, "scrap_percent", e.target.value)
                      }
                      placeholder="Scrap %"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>

              <textarea
                value={bomNotes}
                onChange={(e) => setBomNotes(e.target.value)}
                placeholder="Notes"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setBomLines((current) => [...current, { ...emptyBomLine }])
                  }
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Add Line
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Save BOM
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold text-gray-950">BOM List</h2>
              <p className="text-sm text-gray-500">
                {loading ? "Loading..." : `${boms.length} active BOMs`}
              </p>
            </div>

            {boms.length === 0 ? (
              <p className="text-sm text-gray-500">No BOMs found.</p>
            ) : (
              <div className="space-y-4">
                {boms.map((bom) => (
                  <article
                    key={bom.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {bom.product_sku} - {bom.product_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Version {bom.version} -{" "}
                          {bom.is_active ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm text-gray-700">
                      {bom.lines.map((line) => (
                        <li key={line.id}>
                          {line.raw_material_sku} - {line.raw_material_name}:{" "}
                          {line.quantity_per_unit} per unit
                          {Number(line.scrap_percent) > 0
                            ? ` + ${line.scrap_percent}% scrap`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
