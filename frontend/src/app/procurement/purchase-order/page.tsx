"use client";

import { useEffect, useState } from "react";
import PurchaseOrderForm, {
  SavedPurchaseOrder,
} from "@/components/purchase-order-form";

export default function PurchaseOrderPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<SavedPurchaseOrder[]>([]);

  useEffect(() => {
    async function loadPurchaseOrders() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        return;
      }

      const res = await fetch("http://127.0.0.1:8000/api/procurement/purchase-orders/", {
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

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Add Purchase Order
        </h1>

        <PurchaseOrderForm
          onCreated={(purchaseOrder) =>
            setPurchaseOrders((current) => [...current, purchaseOrder])
          }
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
