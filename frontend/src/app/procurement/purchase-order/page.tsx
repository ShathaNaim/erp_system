"use client";

import { useEffect, useState } from "react";
import { showConfirm } from "@/components/AppNotifications";
import { apiUrl } from "@/lib/api-base";
import { getActionErrorMessage } from "@/lib/api";
import PurchaseOrderForm, {
  SavedPurchaseOrder,
} from "@/components/purchase-order-form";

export default function PurchaseOrderPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<SavedPurchaseOrder[]>([]);
  const [editingPurchaseOrder, setEditingPurchaseOrder] =
    useState<SavedPurchaseOrder | null>(null);
  const [receivingOrderId, setReceivingOrderId] = useState<number | null>(null);

  useEffect(() => {
    async function loadPurchaseOrders() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        return;
      }

      const res = await fetch(apiUrl("/api/procurement/purchase-orders/"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        alert("Failed to load purchase orders");
        return;
      }

      const data: SavedPurchaseOrder[] = await res.json();
      setPurchaseOrders(data);
    }

    loadPurchaseOrders();
  }, []);

  async function receivePurchaseOrder(purchaseOrder: SavedPurchaseOrder) {
    const token = localStorage.getItem("access_token");

    if (!token) {
      alert("You must be logged in to receive purchase orders");
      return;
    }

    setReceivingOrderId(purchaseOrder.id);

    try {
      const res = await fetch(
        apiUrl(`/api/procurement/purchase-orders/${purchaseOrder.id}/receive/`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        alert(getActionErrorMessage(res, "Failed to receive purchase order"));
        return;
      }

      const updatedOrder: SavedPurchaseOrder = await res.json();
      setPurchaseOrders((current) =>
        current.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        )
      );
    } finally {
      setReceivingOrderId(null);
    }
  }

  async function deletePurchaseOrder(purchaseOrder: SavedPurchaseOrder) {
    const confirmed = await showConfirm(
      `Delete purchase order "${purchaseOrder.order_number}"?`
    );
    if (!confirmed) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch(
      apiUrl(`/api/procurement/purchase-orders/${purchaseOrder.id}/`),
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => null);
      alert(error?.detail ?? "Failed to delete purchase order");
      return;
    }

    setPurchaseOrders((current) =>
      current.filter((order) => order.id !== purchaseOrder.id)
    );
    if (editingPurchaseOrder?.id === purchaseOrder.id) {
      setEditingPurchaseOrder(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          {editingPurchaseOrder ? "Edit Purchase Order" : "Add Purchase Order"}
        </h1>

        <PurchaseOrderForm
          key={
            editingPurchaseOrder
              ? `edit-${editingPurchaseOrder.id}`
              : "create"
          }
          initialPurchaseOrder={editingPurchaseOrder}
          onCreated={(purchaseOrder) =>
            setPurchaseOrders((current) => [...current, purchaseOrder])
          }
          onUpdated={(updatedOrder) => {
            setPurchaseOrders((current) =>
              current.map((order) =>
                order.id === updatedOrder.id ? updatedOrder : order
              )
            );
            setEditingPurchaseOrder(null);
          }}
          onCancelEdit={() => setEditingPurchaseOrder(null)}
        />
      </div>

      <section className="mx-auto mt-10 max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-gray-900">
          Purchase Order List
        </h2>
        {purchaseOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No purchase orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-3 pr-4 font-medium">Order Number</th>
                  <th className="py-3 pr-4 font-medium">Supplier ID</th>
                  <th className="py-3 pr-4 font-medium">Order Date</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Lines</th>
                  <th className="py-3 pr-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((purchaseOrder) => (
                  <tr
                    key={purchaseOrder.id}
                    className="border-b border-gray-100"
                  >
                    <td className="py-3 pr-4 text-gray-900">
                      {purchaseOrder.order_number}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {purchaseOrder.supplier}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {purchaseOrder.order_date}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {purchaseOrder.status}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      {purchaseOrder.lines.length}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPurchaseOrder(purchaseOrder)}
                          disabled={purchaseOrder.status !== "draft"}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePurchaseOrder(purchaseOrder)}
                          disabled={purchaseOrder.status !== "draft"}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => receivePurchaseOrder(purchaseOrder)}
                          disabled={
                            receivingOrderId === purchaseOrder.id ||
                            ["received", "cancelled"].includes(
                              purchaseOrder.status
                            )
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {receivingOrderId === purchaseOrder.id
                            ? "Receiving..."
                            : "Mark Received"}
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
