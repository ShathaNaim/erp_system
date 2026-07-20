"use client";

import { useState } from "react";
import type { Customer } from "@/components/add-customer-form";
import { apiUrl } from "@/lib/api-base";

export type FinishedProduct = {
  id: number;
  sku: string;
  name: string;
  description: string;
  product_type: "standard" | "custom";
  unit: string;
  selling_price: string;
  is_active: boolean;
  available_stock: string;
};

export type SalesOrderLine = {
  id: number;
  sales_order: number;
  product: number;
  quantity: string;
  unit_price: string;
  notes: string;
};

export type SalesOrder = {
  id: number;
  order_number: string;
  customer: number;
  order_date: string;
  due_date: string | null;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  lines: SalesOrderLine[];
};

type OrderLineInput = {
  mode: "existing" | "custom";
  productId: string;
  customSku: string;
  customName: string;
  customDescription: string;
  customUnit: string;
  quantity: string;
  unitPrice: string;
  notes: string;
};

type AddOrderFormProps = {
  customers: Customer[];
  products: FinishedProduct[];
  initialOrder?: SalesOrder | null;
  onCreated?: (order: SalesOrder) => void;
  onUpdated?: (order: SalesOrder) => void;
  onCancelEdit?: () => void;
};

const emptyLine = (): OrderLineInput => ({
  mode: "existing",
  productId: "",
  customSku: "",
  customName: "",
  customDescription: "",
  customUnit: "piece",
  quantity: "",
  unitPrice: "",
  notes: "",
});

function orderLinesToInputs(order: SalesOrder): OrderLineInput[] {
  return order.lines.map((line) => ({
    mode: "existing",
    productId: String(line.product),
    customSku: "",
    customName: "",
    customDescription: "",
    customUnit: "piece",
    quantity: line.quantity,
    unitPrice: line.unit_price,
    notes: line.notes,
  }));
}

function formatApiError(error: unknown): string {
  if (!error) {
    return "Failed to save sales order. Check the order and item data.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (Array.isArray(error)) {
    return error.map(formatApiError).join("\n");
  }

  if (typeof error === "object") {
    if (
      "detail" in error &&
      typeof (error as { detail?: unknown }).detail === "string"
    ) {
      return (error as { detail: string }).detail;
    }

    return Object.entries(error)
      .map(([field, value]) => `${field}: ${formatApiError(value)}`)
      .join("\n");
  }

  return String(error);
}

export default function AddOrderForm({
  customers,
  products,
  initialOrder,
  onCreated,
  onUpdated,
  onCancelEdit,
}: AddOrderFormProps) {
  const [orderNumber, setOrderNumber] = useState(
    initialOrder?.order_number ?? ""
  );
  const [customerId, setCustomerId] = useState(
    initialOrder ? String(initialOrder.customer) : ""
  );
  const [orderDate, setOrderDate] = useState(initialOrder?.order_date ?? "");
  const [dueDate, setDueDate] = useState(initialOrder?.due_date ?? "");
  const [status, setStatus] = useState(initialOrder?.status ?? "draft");
  const [notes, setNotes] = useState(initialOrder?.notes ?? "");
  const [lines, setLines] = useState<OrderLineInput[]>(
    initialOrder ? orderLinesToInputs(initialOrder) : [emptyLine()]
  );
  const isEditing = Boolean(initialOrder);

  function updateLine(
    index: number,
    field: keyof OrderLineInput,
    value: string
  ) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line
      )
    );
  }

  function selectProduct(index: number, productId: string) {
    const product = products.find((item) => item.id === Number(productId));
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              productId,
              unitPrice: product?.selling_price ?? line.unitPrice,
            }
          : line
      )
    );
  }

  function changeLineMode(index: number, mode: OrderLineInput["mode"]) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...emptyLine(),
              mode,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              notes: line.notes,
            }
          : line
      )
    );
  }

  function addLine() {
    setLines((current) => [...current, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.length === 1
        ? current
        : current.filter((_, lineIndex) => lineIndex !== index)
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("You must be logged in to create sales orders");
      return;
    }

    const orderLines = lines.map((line) => ({
      ...(line.mode === "existing"
        ? { product: Number(line.productId) }
        : {
            custom_product: {
              sku: line.customSku,
              name: line.customName,
              description: line.customDescription,
              unit: line.customUnit,
            },
          }),
      quantity: Number(line.quantity),
      unit_price: Number(line.unitPrice),
      notes: line.notes,
    }));

    const url = initialOrder
      ? apiUrl(`/api/sales/sales-orders/${initialOrder.id}/`)
      : apiUrl("/api/sales/sales-orders/");

    const res = await fetch(url, {
      method: initialOrder ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        order_number: orderNumber,
        customer: Number(customerId),
        order_date: orderDate,
        due_date: dueDate || null,
        status,
        notes,
        lines: orderLines,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      console.error("Sales order error:", error);
      alert(formatApiError(error));
      return;
    }

    const savedOrder: SalesOrder = await res.json();
    if (initialOrder) {
      onUpdated?.(savedOrder);
    } else {
      onCreated?.(savedOrder);
    }

    setOrderNumber("");
    setCustomerId("");
    setOrderDate("");
    setDueDate("");
    setStatus("draft");
    setNotes("");
    setLines([emptyLine()]);
    alert(
      initialOrder
        ? "Sales order was updated successfully"
        : "Sales order and its items were saved successfully"
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
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
            Customer
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            required
          >
            <option value="">Select customer</option>
            {customers
              .filter((customer) => customer.is_active)
              .map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
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
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
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
            <option value="confirmed">Confirmed</option>
            <option value="in_production">In Production</option>
            <option value="ready">Ready</option>
            <option value="shipped">Shipped</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Order Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Order Items
            </h2>
            <p className="text-sm text-gray-500">
              Select an existing product or define a customized product.
            </p>
          </div>
          <button
            type="button"
            onClick={addLine}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
          >
            Add Item
          </button>
        </div>

        {lines.map((line, index) => (
          <section
            key={index}
            className="space-y-4 rounded-lg border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Item {index + 1}</h3>
              <button
                type="button"
                onClick={() => removeLine(index)}
                disabled={lines.length === 1}
                className="text-sm text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove
              </button>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Product Source
              </label>
              <select
                value={line.mode}
                onChange={(e) =>
                  changeLineMode(
                    index,
                    e.target.value as OrderLineInput["mode"]
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="existing">Existing product</option>
                <option value="custom">New customized product</option>
              </select>
            </div>

            {line.mode === "existing" ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Product
                </label>
                <select
                  value={line.productId}
                  onChange={(e) => selectProduct(index, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} - {product.name} ({product.product_type};
                      stock: {product.available_stock})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Custom SKU
                  </label>
                  <input
                    type="text"
                    value={line.customSku}
                    onChange={(e) =>
                      updateLine(index, "customSku", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Custom Product Name
                  </label>
                  <input
                    type="text"
                    value={line.customName}
                    onChange={(e) =>
                      updateLine(index, "customName", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={line.customUnit}
                    onChange={(e) =>
                      updateLine(index, "customUnit", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Product Description
                  </label>
                  <textarea
                    value={line.customDescription}
                    onChange={(e) =>
                      updateLine(index, "customDescription", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="Describe the customized product."
                  />
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(index, "quantity", e.target.value)
                  }
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
                  onChange={(e) =>
                    updateLine(index, "unitPrice", e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Item Notes / Custom Specifications
              </label>
              <textarea
                value={line.notes}
                onChange={(e) => updateLine(index, "notes", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Dimensions, color, material, drawing reference, or other requirements."
              />
            </div>
          </section>
        ))}
      </div>

      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700"
      >
        {isEditing ? "Update Sales Order" : "Save Sales Order"}
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
