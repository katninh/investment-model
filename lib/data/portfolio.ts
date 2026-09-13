import { getConviction } from './conviction';
import { getSettings } from './config';
import { constructPortfolio, type Allocation } from '@/lib/model/portfolio';

export async function getPortfolio(): Promise<{ allocations: Allocation[]; regime: string }> {
  const [{ results, regime }, settings] = await Promise.all([getConviction(), getSettings()]);
  return { allocations: constructPortfolio(results, settings.constraints), regime };
}
