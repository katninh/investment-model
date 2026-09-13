import { getConviction } from './conviction';
import { constructPortfolio, DEFAULT_CONSTRAINTS, type Allocation } from '@/lib/model/portfolio';

export async function getPortfolio(): Promise<{ allocations: Allocation[]; regime: string }> {
  const { results, regime } = await getConviction();
  return { allocations: constructPortfolio(results, DEFAULT_CONSTRAINTS), regime };
}
