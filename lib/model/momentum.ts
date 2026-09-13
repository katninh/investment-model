// Model 4 — Technical Momentum (PRD §7.5). Pure, no side effects.
// Price vs 50/200-day SMAs + RSI(14) → a -2..+2 momentum score per asset.
// (Volume trend from §7.5 is omitted — only closes are stored.)

export interface MomentumScore {
  score: number; // -2..+2
  price: number;
  sma50: number | null;
  sma200: number | null;
  rsi: number | null;
  above200: boolean | null;
  n: number; // series length
}

export function sma(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  let sum = 0;
  for (let i = prices.length - period; i < prices.length; i++) sum += prices[i];
  return sum / period;
}

// Cutler's RSI (SMA-based) over `period` price changes.
export function rsi(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  const avgLoss = loss / period;
  if (avgLoss === 0) return 100;
  const rs = gain / period / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function momentumScore(prices: number[]): MomentumScore {
  const price = prices.length ? prices[prices.length - 1] : NaN;
  const sma50 = sma(prices, 50);
  const sma200 = sma(prices, 200);
  const r = rsi(prices, 14);

  let score = 0;
  if (sma200 !== null) score += price > sma200 ? 1 : -1; // primary trend
  if (sma50 !== null) score += price > sma50 ? 0.5 : -0.5; // medium trend
  if (r !== null) {
    if (r < 30) score += 0.5; // oversold — contrarian bounce
    else if (r > 70) score -= 0.5; // overbought
  }
  score = Math.max(-2, Math.min(2, score));

  return {
    score,
    price,
    sma50,
    sma200,
    rsi: r,
    above200: sma200 === null ? null : price > sma200,
    n: prices.length,
  };
}
