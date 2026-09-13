import { getConviction } from './conviction';
import { constructPortfolio } from '@/lib/model/portfolio';
import { buildBrief, toMarkdown, type Brief } from '@/lib/model/brief';

export async function getBrief(): Promise<{ brief: Brief; markdown: string }> {
  const c = await getConviction();
  const allocations = constructPortfolio(c.results);
  const asOf = new Date().toISOString().slice(0, 10);

  const brief = buildBrief({
    asOf,
    regime: c.models.regime.call,
    sentiment: c.models.sentiment.composite,
    valuation: c.models.valuation.assets,
    scenarios: c.models.scenarios.results,
    ev: c.models.scenarios.ev,
    conviction: c.results,
    allocations,
  });

  return { brief, markdown: toMarkdown(brief) };
}
