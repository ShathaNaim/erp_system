import Link from "next/link";

const modules = [
  {
    href: "/sales",
    title: "Sales",
    description: "Create customer orders and route demand to inventory or production.",
    metric: "Orders",
  },
  {
    href: "/inventory",
    title: "Inventory",
    description: "Check stock, review shortages, and request production orders.",
    metric: "Stock",
  },
  {
    href: "/production",
    title: "Production",
    description: "Manage production orders, consume materials, and receive output.",
    metric: "Orders",
  },
  {
    href: "/procurement",
    title: "Procurement",
    description: "Manage suppliers, raw materials, and purchase orders.",
    metric: "Supply",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold text-emerald-700">
            Operations dashboard
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold text-gray-950">
            Manage sales demand, inventory shortages, and production output in
            one flow.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600">
            Start from the department you need. Sales creates demand, inventory
            checks availability, production fulfills shortages, and procurement
            keeps raw materials moving.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    {module.metric}
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-gray-950">
                    {module.title}
                  </h2>
                </div>
                <span className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                  Open
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-gray-600">
                {module.description}
              </p>
            </Link>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-950">Demand Flow</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Confirmed sales orders create production orders when stock is not
              enough.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-950">Stock Flow</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Inventory can request production directly for missing finished
              goods.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-gray-950">Material Flow</p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Production records raw material usage and reduces inventory
              quantities.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
