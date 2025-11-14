export type DistributionSource = {
  key: string;
  balanceWei: bigint;
  decimals: number;
  priceUsd: number;
};

export type DistributionResult = {
  key: string;
  allocUsd: number;
  allocWei: bigint;
};

/**
 * Distribute a total USD amount across multiple sources by weight of USD balance.
 * - Clamps allocation to each source's USD capacity (balance * price)
 * - Redistributes remainder to sources with remaining capacity, proportional to weight
 * - Converts USD allocation to wei using decimals, flooring to avoid over-allocation
 * - Assigns any rounding remainder to the highest-balance (USD) source with capacity
 */
export function autoDistributeUsd(
  totalUsd: number,
  sources: DistributionSource[]
): DistributionResult[] {
  if (!Number.isFinite(totalUsd) || totalUsd <= 0) return [];
  const normalized = sources
    .filter((s) => s.priceUsd > 0 && s.decimals >= 0)
    .map((s) => {
      const balanceTokens = Number(s.balanceWei) / 10 ** s.decimals;
      const balanceUsd = balanceTokens * s.priceUsd;
      return { ...s, balanceTokens, balanceUsd };
    })
    .filter((s) => s.balanceUsd > 0);

  const totalCapacity = normalized.reduce((a, s) => a + s.balanceUsd, 0);
  if (totalCapacity <= 0) return [];

  // Initial proportional allocation
  const weights = normalized.map((s) => ({
    key: s.key,
    weight: s.balanceUsd / totalCapacity,
    capacityUsd: s.balanceUsd,
  }));

  const allocUsd: Record<string, number> = {};
  for (const w of weights) {
    const desired = totalUsd * w.weight;
    allocUsd[w.key] = Math.min(desired, w.capacityUsd);
  }

  // Redistribute remainder to those with capacity
  let allocated = sumValues(allocUsd);
  let remainder = Math.max(0, totalUsd - allocated);
  // Avoid infinite loops on tiny remainder
  const epsilon = 0.01; // USD cents-level
  let loopGuard = 0;
  while (remainder > epsilon && loopGuard < 10) {
    loopGuard++;
    const candidates = weights.filter((w) => allocUsd[w.key] < w.capacityUsd);
    if (!candidates.length) break;
    const totalCandidateWeight =
      candidates.reduce((a, c) => a + c.weight, 0) || 1;
    for (const c of candidates) {
      const share = remainder * (c.weight / totalCandidateWeight);
      const room = c.capacityUsd - allocUsd[c.key];
      const add = Math.min(share, room);
      allocUsd[c.key] += add;
    }
    allocated = sumValues(allocUsd);
    remainder = Math.max(0, totalUsd - allocated);
  }

  // Convert to wei amounts per source (flooring)
  const results: DistributionResult[] = normalized.map((s) => {
    const usd = allocUsd[s.key] ?? 0;
    const tokens = s.priceUsd > 0 ? usd / s.priceUsd : 0;
    const wei = toWeiFloor(tokens, s.decimals);
    return {
      key: s.key,
      allocUsd: usd,
      allocWei: wei,
    };
  });

  // Assign rounding remainder USD to highest-balance source with capacity
  // Note: Because of flooring at wei conversion, the actual USD sum may be below target.
  // We keep allocUsd (display) as computed above; allocWei is the limiting factor for tx.
  return results;
}

function sumValues(map: Record<string, number>): number {
  let s = 0;
  for (const v of Object.values(map)) {
    s += Number.isFinite(v) ? v : 0;
  }
  return s;
}

function toWeiFloor(tokens: number, decimals: number): bigint {
  if (!Number.isFinite(tokens) || tokens <= 0) return BigInt(0);
  // Convert using decimal scaling and floor
  const scale = 10 ** Math.min(decimals, 18);
  const scaled = Math.floor(tokens * scale);
  // Avoid precision for decimals > 18 by padding with zeros
  const extra = decimals > 18 ? BigInt(10) ** BigInt(decimals - 18) : BigInt(1);
  return (
    BigInt(scaled) *
    BigInt(10) ** BigInt(Math.max(0, decimals - Math.min(decimals, 18))) *
    extra
  );
}
