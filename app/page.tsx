import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Macro Investment Model</h1>
        <p className="mt-1 text-sm text-zinc-500">Live five-layer regime &amp; conviction system.</p>
      </div>
      <nav className="flex flex-col gap-2 text-sm">
        <Link href="/indicators" className="text-blue-600 hover:underline dark:text-blue-400">
          Indicators Explorer →
        </Link>
      </nav>
    </main>
  );
}
