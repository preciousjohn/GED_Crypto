import { useState } from 'react';
import './PortfolioScreen.css';

const TIMEFRAMES = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y', 'MAX'];

const HOLDINGS = [
  {
    name: 'Bitcoin',
    symbol: 'BTC',
    amount: '0.12345678 BTC',
    value: '$7,407.40',
    change: '+$173.33',
    changePct: '+2.34%',
    positive: true,
    color: '#F7931A',
    icon: '₿',
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    amount: '1.5 ETH',
    value: '$4,800.00',
    change: '-$53.76',
    changePct: '-1.12%',
    positive: false,
    color: '#627EEA',
    icon: '◆',
  },
  {
    name: 'USDC',
    symbol: 'USDC',
    amount: '1,298.00 USDC',
    value: '$1,298.00',
    change: '$0.00',
    changePct: '0.00%',
    positive: true,
    color: '#2775CA',
    icon: '$',
  },
];

export function PortfolioScreen() {
  const [activeTimeframe, setActiveTimeframe] = useState('1D');

  return (
    <div className="portfolio">
      <header className="portfolio__header">
        <p className="portfolio__label">Total investments</p>
        <h1 className="portfolio__balance">$12,345.67</h1>
        <p className="portfolio__change portfolio__change--positive">
          ↑ $123.45 (1.01%) 1D
        </p>
      </header>

      <div className="portfolio__chart">
        <span>Chart – portfolio performance over time</span>
      </div>

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
          Available to invest: <strong>$1,234.56</strong>
        </span>
        <span className="portfolio__chevron" aria-hidden="true">›</span>
      </button>

      <section className="portfolio__holdings">
        <h2 className="portfolio__section-title">Crypto</h2>
        {HOLDINGS.map((h) => (
          <div key={h.symbol} className="portfolio__holding">
            <div className="portfolio__holding-icon" style={{ background: h.color }}>
              {h.icon}
            </div>
            <div className="portfolio__holding-info">
              <span className="portfolio__holding-name">{h.name}</span>
              <span className="portfolio__holding-amount">{h.amount}</span>
            </div>
            <div className="portfolio__holding-value">
              <span className="portfolio__holding-price">{h.value}</span>
              <span className={`portfolio__holding-change ${h.positive ? 'portfolio__holding-change--positive' : 'portfolio__holding-change--negative'}`}>
                {h.positive ? '▲' : '▼'} {h.change.replace('-', '')} ({h.changePct})
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
