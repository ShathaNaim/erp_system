"use client";

import { useEffect, useState } from "react";

type Supplier = {
  id: number;
  name: string;
};

type RawMaterial = {
  id: number;
  name: string;
};

type PurchaseOrderLine = {
  rawMaterialId: string;
  quantity: string;
  unitPrice: string;
};

export type SavedPurchaseOrderLine = {
  id: number;
  raw_material: number;
  quantity: number;
  unit_price: number;
};

export type SavedPurchaseOrder = {
  id: number;
  order_number: string;
  supplier: number;
  order_date: string;
  expected_date: string | null;
  status: string;
  notes: string;
  lines: SavedPurchaseOrderLine[];
};

type PurchaseOrderFormProps = {
  initialPurchaseOrder?: SavedPurchaseOrder | null;
  onCreated?: (purchaseOrder: SavedPurchaseOrder) => void;
  onUpdated?: (purchaseOrder: SavedPurchaseOrder) => void;
  onCancelEdit?: () => void;
};

const emptyLine: PurchaseOrderLine = {
  rawMaterialId: "",
  quantity: "",
  unitPrice: "",
};

function purchaseOrderLinesToInputs(
  purchaseOrder: SavedPurchaseOrder
): PurchaseOrderLine[] {
  return purchaseOrder.lines.map((line) => ({
    rawMaterialId: String(line.raw_material),
    quantity: String(line.quantity),
    unitPrice: String(line.unit_price),
  }));
}

export default function PurchaseOrderForm({
  initialPurchaseOrder,
  onCreated,
  onUpdated,
  onCancelEdit,
}: PurchaseOrderFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [orderNumber, setOrderNumber] = useState(
    initialPurchaseOrder?.order_number ?? ""
  );
  const [supplierId, setSupplierId] = useState(
    initialPurchaseOrder ? String(initialPurchaseOrder.supplier) : ""
  );
  const [orderDate, setOrderDate] = useState(
    initialPurchaseOrder?.order_date ?? ""
  );
  const [expectedDate, setExpectedDate] = useState(
    initialPurchaseOrder?.expected_date ?? ""
  );
  const [status, setStatus] = useState(initialPurchaseOrder?.status ?? "draft");
  const [notes, setNotes] = useState(initialPurchaseOrder?.notes ?? "");
  const [lines, setLines] = useState<PurchaseOrderLine[]>(
    initialPurchaseOrder
      ? purchaseOrderLinesToInputs(initialPurchaseOrder)
      : [{ ...emptyLine }]
  );
  const isEditing = Boolean(initialPurchaseOrder);

  useEffect(() => {
    async function loadSuppliers() {
      const token = localStorage.getItem("access_token");

      const res = await fetch("http://127.0.0.1:8000/api/procurement/suppliers/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        alert("Failed to load suppliers");
        return;
      }

      const data = await res.json();
      setSuppliers(data);
    }

    loadSuppliers();
  }, []);

  useEffect(() => {
    async function loadRawMaterials() {
      const token = localStorage.getItem("access_token");

      const res = await fetch("http://127.0.0.1:8000/api/procurement/raw-materials/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        alert("Failed to load raw materials");
        return;
      }

      const data = await res.json();
      setRawMaterials(data);
    }

    loadRawMaterials();
  }, []);

  function updateLine(
    index: number,
    field: keyof PurchaseOrderLine,
    value: string
  ) {
    setLines((currentLines) =>
      currentLines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line
      )
    );
  }

  function addLine() {
    setLines((currentLines) => [...currentLines, { ...emptyLine }]);
  }

  function removeLine(index: number) {
    setLines((currentLines) =>
      currentLines.length === 1
        ? currentLines
        : currentLines.filter((_, lineIndex) => lineIndex !== index)
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const token = localStorage.getItem("access_token");

    const url = initialPurchaseOrder
      ? `http://127.0.0.1:8000/api/procurement/purchase-orders/${initialPurchaseOrder.id}/`
      : "http://127.0.0.1:8000/api/procurement/purchase-orders/";

    const res = await fetch(url, {
      method: initialPurchaseOrder ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        order_number: orderNumber,
        supplier: Number(supplierId),
        order_date: orderDate,
        expected_date: expectedDate || null,
        status,
        notes,
        lines: lines.map((line) => ({
          raw_material: Number(line.rawMaterialId),
          quantity: Number(line.quantity),
          unit_price: Number(line.unitPrice),
        })),
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      alert(error?.detail ?? "Failed to save purchase order");
      return;
    }

    const savedPurchaseOrder: SavedPurchaseOrder = await res.json();
    if (initialPurchaseOrder) {
      onUpdated?.(savedPurchaseOrder);
    } else {
      onCreated?.(savedPurchaseOrder);
    }

    alert(
      initialPurchaseOrder
        ? "Purchase order updated successfully"
        : "Purchase order saved successfully"
    );

    setOrderNumber("");
    setSupplierId("");
    setOrderDate("");
    setExpectedDate("");
    setStatus("draft");
    setNotes("");
    setLines([{ ...emptyLine }]);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Order Number
        </label>
        <input
          type="text"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Supplier
        </label>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          required
        >
          <option value="">Select supplier</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Order Date
        </label>
        <input
          type="date"
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Expected Date
        </label>
        <input
          type="date"
          value={expectedDate}
          onChange={(e) => setExpectedDate(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        >
          <option value="draft">Draft</option>
          <option value="ordered">Ordered</option>
          <option value="partially_received">Partially Received</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Raw Materials</h2>
          <button
            type="button"
            onClick={addLine}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Add Material
          </button>
        </div>

        {lines.map((line, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[1fr_120px_120px_auto]"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Raw Material
              </label>
              <select
                value={line.rawMaterialId}
                onChange={(e) =>
                  updateLine(index, "rawMaterialId", e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              >
                <option value="">Select raw material</option>
                {rawMaterials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={line.quantity}
                onChange={(e) => updateLine(index, "quantity", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Unit Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={line.unitPrice}
                onChange={(e) => updateLine(index, "unitPrice", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => removeLine(index)}
                disabled={lines.length === 1}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700"
      >
        {isEditing ? "Update Purchase Order" : "Save Purchase Order"}
      </button>
      {isEditing && (
        <button
          type="button"
          onClick={onCancelEdit}
          className="ml-2 rounded-lg border border-gray-300 px-5 py-2 text-gray-700 hover:bg-gray-50"
        >
          Cancel Edit
        </button>
      )}
    </form>
  );
}
