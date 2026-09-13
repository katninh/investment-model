import Link from 'next/link';
import { getRegimeCall } from '@/lib/data/regime';
import { RegimeBanner } from '@/components/RegimeBanner';

export const revalidate = 3600;

export default async function Home() {
  const { call } = await getRegimeCall();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Macro Investment Model</h1>
        <p className="mt-1 text-sm text-zinc-500">Live five-layer regime &amp; conviction system.</p>
      </div>

      <RegimeBanner call={call} />

      <nav className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/regime" className="text-blue-600 hover:underline dark:text-blue-400">
          Macro Regime →
        </Link>
        <Link href="/sentiment" className="text-blue-600 hover:underline dark:text-blue-400">
          Sentiment →
        </Link>
        <Link href="/valuation" className="text-blue-600 hover:underline dark:text-blue-400">
          Valuation →
        </Link>
        <Link href="/momentum" className="text-blue-600 hover:underline dark:text-blue-400">
          Momentum →
        </Link>
        <Link href="/indicators" className="text-blue-600 hover:underline dark:text-blue-400">
          Indicators Explorer →
        </Link>
      </nav>
    </main>
  );
}
