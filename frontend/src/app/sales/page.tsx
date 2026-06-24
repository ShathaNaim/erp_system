import Link from "next/link";

const salesSections = [
  {
    href: "/sales/customer",
    title: "Customers",
    description: "Create customers and view the customer list.",
  },
  {
    href: "/sales/order",
    title: "Sales Orders",
    description:
      "Create an order with its standard or customized product items.",
  },
];

export default function SalesPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
          <p className="mt-2 text-gray-600">
            Choose the sales section you want to manage.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {salesSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-lg bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <h2 className="text-xl font-semibold text-gray-900">
                {section.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {section.description}
              </p>
              <span className="mt-6 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">
                Open {section.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
