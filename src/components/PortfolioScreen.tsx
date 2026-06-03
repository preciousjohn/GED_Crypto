import { useMemo, useState } from 'react';
import type { PortfolioApi } from '../hooks/usePortfolio';
import { formatUsd } from '../utils/sendIntent';
import './PortfolioScreen.css';

const TIMEFRAMES = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y', 'MAX'] as const;

const CHART_DATA: Record<(typeof TIMEFRAMES)[number], number[]> = {
  '1D': [0.98, 0.99, 1.0, 0.995, 1.01, 1.008, 1.01],
  '1W': [0.94, 0.96, 0.97, 0.99, 1.0, 1.02, 1.01],
  '1M': [0.88, 0.91, 0.93, 0.96, 0.98, 1.0, 1.01],
  '3M': [0.82, 0.86, 0.9, 0.94, 0.97, 1.0, 1.01],
  YTD: [0.75, 0.8, 0.85, 0.9, 0.95, 0.98, 1.01],
  '1Y': [0.6, 0.7, 0.78, 0.85, 0.92, 0.97, 1.01],
  '5Y': [0.35, 0.5, 0.65, 0.78, 0.88, 0.95, 1.01],
  MAX: [0.2, 0.35, 0.5, 0.68, 0.82, 0.93, 1.01],
};

interface PortfolioScreenProps {
  portfolio: PortfolioApi;
}

function MiniChart({ points, total }: { points: number[]; total: number }) {
  const width = 320;
  const height = 140;
  const padding = 12;

  const path = useMemo(() => {
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const coords = points.map((p, i) => {
      const x = padding + (i / (points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });
    return `M ${coords.join(' L ')}`;
  }, [points]);

  const endValue = total * points[points.length - 1];
  const startValue = total * points[0];
  const change = endValue - startValue;
  const changePct = (change / startValue) * 100;
  const positive = change >= 0;

  return (
    <div className="portfolio__chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="portfolio__chart-svg" aria-hidden="true">
        <path d={path} fill="none" stroke={positive ? 'var(--ck-green)' : 'var(--ck-red)'} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p className={`portfolio__chart-change ${positive ? 'portfolio__change--positive' : 'portfolio__change--negative'}`}>
        {positive ? '↑' : '↓'} {formatUsd(Math.abs(change))} ({Math.abs(changePct).toFixed(2)}%)
      </p>
    </div>
  );
}

export function PortfolioScreen({ portfolio }: PortfolioScreenProps) {
  const [activeTimeframe, setActiveTimeframe] = useState<(typeof TIMEFRAMES)[number]>('1D');

  const dayChange = portfolio.totalValue * 0.0101;
  const availableCash = portfolio.getHolding('USDC')?.quantity ?? 0;

  return (
    <div className="portfolio">
      <header className="portfolio__header">
        <p className="portfolio__label">Total investments</p>
        <h1 className="portfolio__balance">{portfolio.totalLabel}</h1>
        <p className="portfolio__change portfolio__change--positive">
          ↑ {formatUsd(dayChange)} (1.01%) 1D
        </p>
      </header>

      <MiniChart points={CHART_DATA[activeTimeframe]} total={portfolio.totalValue} />

      <nav className="portfolio__timeframes" aria-label="Time range">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            className={`portfolio__timeframe ${activeTimeframe === tf ? 'portfolio__timeframe--active' : ''}`}
            onClick={() => setActiveTimeframe(tf)}
          >
            {tf}
          </button>
        ))}
      </nav>

      <button type="button" className="portfolio__available">
        <span>
          Available to send: <strong>{formatUsd(availableCash)}</strong>
        </span>
        <span className="portfolio__chevron" aria-hidden="true">›</span>
      </button>

      <section className="portfolio__holdings">
        <h2 className="portfolio__section-title">Crypto</h2>
        {portfolio.holdings.map((h) => (
          <div key={h.symbol} className="portfolio__holding">
            <div className="portfolio__holding-icon" style={{ background: h.color }}>
              {h.icon}
            </div>
            <div className="portfolio__holding-info">
              <span className="portfolio__holding-name">{h.name}</span>
              <span className="portfolio__holding-amount">{h.quantityLabel}</span>
            </div>
            <div className="portfolio__holding-value">
              <span className="portfolio__holding-price">{h.valueLabel}</span>
              <span className={`portfolio__holding-change ${h.positive ? 'portfolio__holding-change--positive' : 'portfolio__holding-change--negative'}`}>
                {h.positive ? '▲' : '▼'} {formatUsd(Math.abs(h.changeUsd))} ({Math.abs(h.changePct).toFixed(2)}%)
              </span>
            </div>
          </div>
        ))}
      </section>

      <footer className="portfolio__actions">
        <button type="button" className="portfolio__action-btn">Buy</button>
        <button type="button" className="portfolio__action-btn">Sell</button>
      </footer>
    </div>
  );
}
