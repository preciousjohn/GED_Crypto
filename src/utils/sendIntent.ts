import type { AssetSymbol } from '../types/portfolio';

export interface ParsedSendIntent {
  contact: string;
  amountUsd: number;
  asset: AssetSymbol;
  memo?: string;
}

const CONTACTS = ['sarah', 'john', 'mike', 'alex', 'emma'];

const ASSET_ALIASES: Record<string, AssetSymbol> = {
  btc: 'BTC',
  bitcoin: 'BTC',
  eth: 'ETH',
  ethereum: 'ETH',
  usdc: 'USDC',
  usd: 'USDC',
  dollars: 'USDC',
  dollar: 'USDC',
};

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/[.!?,]/g, '');
}

function findContact(text: string): string | null {
  const normalized = normalize(text);
  for (const name of CONTACTS) {
    if (normalized.includes(name)) {
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  return null;
}

function findAsset(text: string): AssetSymbol {
  const normalized = normalize(text);
  for (const [alias, symbol] of Object.entries(ASSET_ALIASES)) {
    if (normalized.includes(alias)) return symbol;
  }
  return 'USDC';
}

function findAmount(text: string): number | null {
  const dollarMatch = text.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/i);
  if (dollarMatch) {
    return parseFloat(dollarMatch[1].replace(/,/g, ''));
  }

  const wordMatch = normalize(text).match(/(?:send|pay|transfer)\s+([\d,]+(?:\.\d{1,2})?)/);
  if (wordMatch) {
    return parseFloat(wordMatch[1].replace(/,/g, ''));
  }

  const trailingMatch = normalize(text).match(/([\d,]+(?:\.\d{1,2})?)\s*(?:usdc|usd|btc|eth|bitcoin|ethereum|dollars?)/);
  if (trailingMatch) {
    return parseFloat(trailingMatch[1].replace(/,/g, ''));
  }

  return null;
}

function findMemo(text: string): string | undefined {
  const forMatch = text.match(/\bfor\s+(.+?)(?:\.|$)/i);
  if (forMatch) return forMatch[1].trim();
  return undefined;
}

export function parseSendIntent(text: string): ParsedSendIntent | null {
  const normalized = normalize(text);
  if (!/(send|pay|transfer)/.test(normalized)) return null;

  const contact = findContact(text);
  const amountUsd = findAmount(text);
  if (!contact || amountUsd == null || amountUsd <= 0) return null;

  return {
    contact,
    amountUsd,
    asset: findAsset(text),
    memo: findMemo(text),
  };
}

export function getNetworkFee(asset: AssetSymbol): number {
  if (asset === 'BTC') return 1.5;
  if (asset === 'ETH') return 0.85;
  return 0.12;
}

export function formatUsd(value: number, compact = false): string {
  if (compact && value >= 1000) {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatQuantity(symbol: AssetSymbol, quantity: number): string {
  if (symbol === 'USDC') {
    return `${quantity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`;
  }
  const decimals = symbol === 'BTC' ? 8 : 4;
  return `${quantity.toFixed(decimals)} ${symbol}`;
}
