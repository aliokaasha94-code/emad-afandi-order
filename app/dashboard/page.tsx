import DashboardClient from "@/components/DashboardClient";

export default function DashboardPage() {
  return (
    <main className="min-h-screen">
      <header className="no-print border-b border-espresso/10 bg-cream/90 px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <b className="font-cairo text-xl">عماد أفندي • داشبورد</b>
          <span className="rounded-full bg-espresso px-3 py-1 text-xs text-cream">Manual mode • Foodics-ready</span>
        </div>
      </header>
      <DashboardClient />
    </main>
  );
}
