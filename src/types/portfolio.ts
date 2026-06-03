export type AssetSymbol = 'BTC' | 'ETH' | 'USDC';

export interface Holding {
  name: string;
  symbol: AssetSymbol;
  quantity: number;
  priceUsd: number;
  color: string;
  icon: string;
}

export interface PortfolioState {
  holdings: Holding[];
  transactions: Activity[];
}

export interface Activity {
  id: string;
  type: 'send';
  contact: string;
  amountUsd: number;
  asset: AssetSymbol;
  feeUsd: number;
  timestamp: number;
}

export interface SendRequest {
  contact: string;
  amountUsd: number;
  asset: AssetSymbol;
  memo?: string;
}
