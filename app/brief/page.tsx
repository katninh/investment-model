import Link from 'next/link';
import { getBrief } from '@/lib/data/brief';

export const revalidate = 3600;

export default async function BriefPage() {
  const { brief, markdown } = await getBrief();

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{brief.title}</h1>
        <Link href="/portfolio" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          Portfolio →
        </Link>
      </div>
      <p className="text-sm text-zinc-500">As of {brief.asOf}</p>

      <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-900">
        {brief.summary}
      </p>

      {brief.sections.map((s) => (
        <section key={s.heading} className="mt-6">
          <h2 className="text-lg font-semibold">{s.heading}</h2>
          {s.paragraphs.map((p, i) => (
            <p key={i} className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              {p}
            </p>
          ))}
          {s.bullets.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
              {s.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <hr className="my-6 border-zinc-200 dark:border-zinc-800" />
      <p className="text-xs italic text-zinc-500">{brief.disclaimer}</p>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-zinc-500">Markdown (copy to export)</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900">{markdown}</pre>
      </details>
    </main>
  );
}
