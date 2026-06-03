import { useCallback, useMemo, useState } from 'react';
import type { Activity, AssetSymbol, Holding, PortfolioState, SendRequest } from '../types/portfolio';
import { formatQuantity, formatUsd, getNetworkFee } from '../utils/sendIntent';

const INITIAL_HOLDINGS: Holding[] = [
  { name: 'Bitcoin', symbol: 'BTC', quantity: 0.12345678, priceUsd: 60_000, color: '#F7931A', icon: '₿' },
  { name: 'Ethereum', symbol: 'ETH', quantity: 1.5, priceUsd: 3_200, color: '#627EEA', icon: '◆' },
  { name: 'USDC', symbol: 'USDC', quantity: 1_298, priceUsd: 1, color: '#2775CA', icon: '$' },
];

const SEED_TRANSACTIONS: Activity[] = [
  {
    id: 'seed-1',
    type: 'send',
    contact: 'Sarah',
    amountUsd: 25,
    asset: 'USDC',
    feeUsd: 0.12,
    timestamp: Date.now() - 1000 * 60 * 60 * 26,
  },
  {
    id: 'seed-2',
    type: 'send',
    contact: 'John',
    amountUsd: 100,
    asset: 'USDC',
    feeUsd: 0.12,
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
];

export function usePortfolio() {
  const [state, setState] = useState<PortfolioState>({
    holdings: INITIAL_HOLDINGS,
    transactions: SEED_TRANSACTIONS,
  });

  const totalValue = useMemo(
    () => state.holdings.reduce((sum, h) => sum + h.quantity * h.priceUsd, 0),
    [state.holdings]
  );

  const getHolding = useCallback(
    (symbol: AssetSymbol) => state.holdings.find((h) => h.symbol === symbol),
    [state.holdings]
  );

  const getAssetBalanceUsd = useCallback(
    (symbol: AssetSymbol) => {
      const holding = getHolding(symbol);
      return holding ? holding.quantity * holding.priceUsd : 0;
    },
    [getHolding]
  );

  const canSend = useCallback(
    (request: SendRequest) => {
      const fee = getNetworkFee(request.asset);
      const holding = getHolding(request.asset);
      if (!holding) return { ok: false as const, reason: 'Asset not found in your portfolio.' };

      const quantitySent =
        request.asset === 'USDC' ? request.amountUsd : request.amountUsd / holding.priceUsd;
      const feeQuantity = request.asset === 'USDC' ? fee : fee / holding.priceUsd;
      const totalNeeded = quantitySent + feeQuantity;

      if (holding.quantity < totalNeeded) {
        return {
          ok: false as const,
          reason: `Insufficient ${request.asset}. You have ${formatQuantity(request.asset, holding.quantity)} available.`,
        };
      }

      return { ok: true as const, fee, remaining: holding.quantity - totalNeeded };
    },
    [getHolding]
  );

  const executeSend = useCallback((request: SendRequest) => {
    const fee = getNetworkFee(request.asset);

    setState((prev) => {
      const holdings = prev.holdings.map((h) => {
        if (h.symbol !== request.asset) return h;

        const quantitySent =
          request.asset === 'USDC' ? request.amountUsd : request.amountUsd / h.priceUsd;
        const feeQuantity = request.asset === 'USDC' ? fee : fee / h.priceUsd;

        return {
          ...h,
          quantity: Math.max(0, h.quantity - quantitySent - feeQuantity),
        };
      });

      const activity: Activity = {
        id: `${Date.now()}`,
        type: 'send',
        contact: request.contact,
        amountUsd: request.amountUsd,
        asset: request.asset,
        feeUsd: fee,
        timestamp: Date.now(),
      };

      return {
        holdings,
        transactions: [activity, ...prev.transactions],
      };
    });

    return fee;
  }, []);

  const holdingsView = useMemo(
    () =>
      state.holdings.map((h) => {
        const value = h.quantity * h.priceUsd;
        const dayChangePct = h.symbol === 'BTC' ? 2.34 : h.symbol === 'ETH' ? -1.12 : 0;
        const dayChangeUsd = value * (dayChangePct / 100);
        return {
          ...h,
          valueUsd: value,
          valueLabel: formatUsd(value),
          quantityLabel: formatQuantity(h.symbol, h.quantity),
          changeUsd: dayChangeUsd,
          changePct: dayChangePct,
          positive: dayChangePct >= 0,
        };
      }),
    [state.holdings]
  );

  return {
    totalValue,
    totalLabel: formatUsd(totalValue),
    holdings: holdingsView,
    transactions: state.transactions,
    getHolding,
    getAssetBalanceUsd,
    canSend,
    executeSend,
    formatUsd,
  };
}

export type PortfolioApi = ReturnType<typeof usePortfolio>;
