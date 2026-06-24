"use client";

import { useState } from "react";

export type Customer = {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AddCustomerFormProps = {
  onCreated?: (customer: Customer) => void;
};

export default function AddCustomerForm({
  onCreated,
}: AddCustomerFormProps) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("You must be logged in to create customers");
      return;
    }

    const res = await fetch("http://127.0.0.1:8000/api/sales/customers/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        contact_name: contactName,
        email,
        phone,
        address,
        is_active: isActive,
      }),
    });

    if (!res.ok) {
      alert("Failed to save customer");
      return;
    }

    const savedCustomer: Customer = await res.json();
    onCreated?.(savedCustomer);

    setName("");
    setContactName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setIsActive(true);
    alert("Customer saved successfully");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          Contact Name
        </label>
        <input
          type="text"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Phone
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Address
        </label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Active customer
      </label>

      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700"
      >
        Save Customer
      </button>
    </form>
  );
}
