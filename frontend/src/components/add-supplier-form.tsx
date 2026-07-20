"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api-base";
import { getActionErrorMessage } from "@/lib/api";

export type Supplier = {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
};

type AddSupplierFormProps = {
  onCreated?: (supplier: Supplier) => void;
};

export default function AddSupplierForm({
  onCreated,
}: AddSupplierFormProps) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const token = localStorage.getItem("access_token");

    if (!token) {
      alert("You must be logged in to create suppliers");
      return;
    }

    const res = await fetch(
      apiUrl("/api/procurement/suppliers/"),
      {
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
        }),
      }
    );

    if (res.status === 403) {
      alert(getActionErrorMessage(res, "You do not have permission to create suppliers"));
      return;
    }

    if (!res.ok) {
      alert(getActionErrorMessage(res, "Failed to save supplier"));
      return;
    }

    const savedSupplier: Supplier = await res.json();
    onCreated?.(savedSupplier);

    setName("");
    setContactName("");
    setEmail("");
    setPhone("");
    setAddress("");

    alert("Supplier saved successfully");
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

      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700"
      >
        Save Supplier
      </button>
    </form>
  );
}
