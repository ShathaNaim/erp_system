"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Customer } from "@/components/add-customer-form";
import AddOrderForm, {
  FinishedProduct,
  SalesOrder,
} from "@/components/add-order-form";

const salesApi = "http://127.0.0.1:8000/api/sales";

export default function OrderPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<FinishedProduct[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [confirmingOrderId, setConfirmingOrderId] = useState<number | null>(
    null
  );

  useEffect(() => {
    async function loadOrderData() {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const [customersRes, productsRes, ordersRes] = await Promise.all([
        fetch(`${salesApi}/customers/`, { headers }),
        fetch(`${salesApi}/products/`, { headers }),
        fetch(`${salesApi}/sales-orders/`, { headers }),
      ]);

      if (!customersRes.ok || !productsRes.ok || !ordersRes.ok) {
        alert("Failed to load sales order data");
        return;
      }

      const [customersData, productsData, ordersData] = await Promise.all([
        customersRes.json() as Promise<Customer[]>,
        productsRes.json() as Promise<FinishedProduct[]>,
        ordersRes.json() as Promise<SalesOrder[]>,
      ]);

      setCustomers(customersData);
      setProducts(productsData);
      setOrders(ordersData);
    }

    loadOrderData();
  }, []);

  async function confirmSalesOrder(order: SalesOrder) {
    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("You must be logged in to confirm sales orders");
      return;
    }

    setConfirmingOrderId(order.id);

    try {
      const res = await fetch(`${salesApi}/sales-orders/${order.id}/confirm/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        alert("Failed to confirm sales order");
        return;
      }

      const updatedOrder: SalesOrder = await res.json();
      setOrders((current) =>
        current.map((item) => (item.id === updatedOrder.id ? updatedOrder : item))
      );
    } finally {
      setConfirmingOrderId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/sales"
          className="mb-4 inline-block text-sm text-emerald-700 hover:underline"
        >
          &larr; Back to Sales
        </Link>

        <section className="rounded-lg bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Add Sales Order
          </h1>
          <p className="mb-6 text-sm text-gray-600">
            Add the customer, order details, and all products in one form.
          </p>
          <AddOrderForm
            customers={customers}
            products={products}
            onCreated={(order) =>
              setOrders((current) => [...current, order])
            }
          />
        </section>

        <section className="mt-10 rounded-lg bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-bold text-gray-900">
            Sales Orders
          </h2>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500">No sales orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-3 pr-4 font-medium">Order Number</th>
                    <th className="py-3 pr-4 font-medium">Customer</th>
                    <th className="py-3 pr-4 font-medium">Order Date</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Items</th>
                    <th className="py-3 pr-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100">
                      <td className="py-3 pr-4 text-gray-900">
                        {order.order_number}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {customers.find(
                          (customer) => customer.id === order.customer
                        )?.name ?? order.customer}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {order.order_date}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {order.status}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {order.lines.length}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        <button
                          type="button"
                          onClick={() => confirmSalesOrder(order)}
                          disabled={
                            confirmingOrderId === order.id ||
                            ["in_production", "ready", "shipped", "cancelled"].includes(
                              order.status
                            )
                          }
                          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {confirmingOrderId === order.id
                            ? "Confirming..."
                            : "Confirm"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
