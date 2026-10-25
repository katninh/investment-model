import { getDataStatus } from '@/lib/data/dataStatus';
import { getIntegrity } from '@/lib/data/integrity';
import { Card, CardTitle, PageHeader, Badge } from '@/components/ui';
import { ManualEntryForm } from '@/components/ManualEntryForm';

export const dynamic = 'force-dynamic';

export default async function DataStatusPage() {
  const [{ rows, ingestion }, integrity] = await Promise.all([getDataStatus(), getIntegrity()]);
  const manual = rows.filter((r) => r.sourceType === 'manual' || r.sourceType === 'scraped');
  const today = new Date().toISOString().slice(0, 10);
  const staleCount = rows.filter((r) => r.stale && r.lastDate).length;
  const liveCount = rows.filter((r) => r.signal != null).length;

  return (
    <div className="animate-fade-up mx-auto max-w-5xl p-4 sm:p-6">
      <PageHeader
        title="Data Status"
        description={`${liveCount}/${rows.length} live · ${staleCount} stale · manual entry for no-API indicators`}
      />

      {/* v5 Pass 0 — errors-log checks, run every time */}
      <Card className="mb-6">
        <CardTitle className="mb-1">Integrity checks (v5 Pass 0)</CardTitle>
        <p className="mb-4 text-xs text-gray-400">The three 2026 errors, encoded as hard checks.</p>
        <ul className="space-y-2.5 text-sm">
          <li className="flex items-start justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-300">
              Real rate = observed 10Y TIPS (never nominal − CPI)
              <span className="block text-xs text-gray-400">{integrity.realRate.reason}</span>
            </span>
            <Badge variant={integrity.realRate.ok ? 'success' : 'error'}>
              {integrity.realRate.value != null ? `${integrity.realRate.value.toFixed(2)}%` : 'missing'}
            </Badge>
          </li>
          <li className="flex items-start justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-300">
              Sahm rule (fires at ≥ 0.50pp)
              <span className="block text-xs text-gray-400">{integrity.sahm?.note ?? 'no Sahm data'}</span>
            </span>
            <Badge variant={integrity.sahm?.triggered ? 'error' : 'success'}>
              {integrity.sahm ? `${integrity.sahm.value.toFixed(2)} · ${integrity.sahm.band}` : '—'}
            </Badge>
          </li>
          {integrity.goldDrivers.map((d) => (
            <li key={d.driver} className="flex items-start justify-between gap-4">
              <span className="text-gray-600 dark:text-gray-300">
                60-day sign: {d.driver === 'gold~oil' ? `gold vs ${integrity.oilSeries === 'FRED_DCOILBRENTEU' ? 'Brent' : 'WTI'}` : 'gold vs 10Y real yield'} (expect −)
                <span className="block text-xs text-gray-400">{d.note}</span>
              </span>
              <Badge variant={d.agrees ? 'success' : 'warning'}>corr {d.corr.toFixed(2)}</Badge>
            </li>
          ))}
          <li className="flex items-start justify-between gap-4">
            <span className="text-gray-600 dark:text-gray-300">
              Stale API series (past their cadence)
              {integrity.stale.length > 0 ? (
                <span className="block text-xs text-gray-400">{integrity.stale.map((s) => s.name).join(', ')}</span>
              ) : null}
            </span>
            <Badge variant={integrity.stale.length ? 'warning' : 'success'}>{integrity.stale.length}</Badge>
          </li>
        </ul>
      </Card>

      {/* ingestion health */}
      <Card className="!p-0">
        <div className="px-5 pt-5">
          <CardTitle>Recent Ingestion Runs</CardTitle>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
                <th className="px-5 py-2.5 font-medium">Source</th>
                <th className="px-3 py-2.5 text-right font-medium">OK</th>
                <th className="px-3 py-2.5 text-right font-medium">Err</th>
                <th className="px-3 py-2.5 font-medium">Mode</th>
                <th className="px-5 py-2.5 font-medium">When (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {ingestion.map((r, i) => (
                <tr key={i} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                  <td className="px-5 py-2.5 font-medium text-gray-800 dark:text-white">{r.source}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-green-600 dark:text-green-400">{r.ok}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {r.err > 0 ? <span className="text-red-600 dark:text-red-400">{r.err}</span> : <span className="text-gray-400">0</span>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{r.notes}</td>
                  <td className="px-5 py-2.5 text-gray-400 tabular-nums">{r.runAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* manual entry */}
      <Card className="mt-6">
        <CardTitle className="mb-1">Manual Data Entry</CardTitle>
        <p className="mb-4 text-xs text-gray-400">
          Indicators with no free API. Entries write to the model immediately (source: manual).
        </p>
        <div className="space-y-3">
          {manual.map((r) => (
            <ManualEntryForm
              key={r.id}
              indicatorId={r.id}
              name={r.name}
              unit={r.unit}
              lastDate={r.lastDate}
              today={today}
            />
          ))}
        </div>
      </Card>

      {/* freshness */}
      <Card className="mt-6 !p-0">
        <div className="px-5 pt-5">
          <CardTitle>Freshness</CardTitle>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
                <th className="px-5 py-2.5 font-medium">Indicator</th>
                <th className="px-3 py-2.5 font-medium">Category</th>
                <th className="px-3 py-2.5 font-medium">Source</th>
                <th className="px-3 py-2.5 font-medium">Frequency</th>
                <th className="px-5 py-2.5 font-medium">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                  <td className="px-5 py-2.5 font-medium text-gray-800 dark:text-white">{r.name}</td>
                  <td className="px-3 py-2.5 text-gray-500">{r.category}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="neutral">{r.sourceType}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{r.frequency}</td>
                  <td className="px-5 py-2.5">
                    <span className="flex items-center gap-2 text-gray-500">
                      {r.lastDate ?? 'never'}
                      {r.stale ? <Badge variant="warning">stale</Badge> : r.lastDate ? <Badge variant="success">fresh</Badge> : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
