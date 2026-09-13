import { getBrief } from '@/lib/data/brief';
import { Card, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function BriefPage() {
  const { brief, markdown } = await getBrief();

  return (
    <div className="animate-fade-up mx-auto max-w-3xl p-4 sm:p-6">
      <PageHeader title={brief.title} description={`As of ${brief.asOf}`} />

      <Card>
        <p className="rounded-lg bg-brand-50 p-4 text-sm font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
          {brief.summary}
        </p>

        {brief.sections.map((s) => (
          <section key={s.heading} className="mt-6">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {p}
              </p>
            ))}
            {s.bullets.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
                {s.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <hr className="my-6 border-gray-200 dark:border-gray-800" />
        <p className="text-xs italic text-gray-400">{brief.disclaimer}</p>
      </Card>

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          Markdown (copy to export)
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          {markdown}
        </pre>
      </details>
    </div>
  );
}
