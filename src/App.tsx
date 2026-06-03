import { useState } from 'react';
import { CopilotFAB } from './components/CopilotFAB';
import { CopilotSheet } from './components/CopilotSheet';
import { PortfolioScreen } from './components/PortfolioScreen';
import { useCopilotConversation } from './hooks/useCopilotConversation';
import './App.css';

function App() {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const copilot = useCopilotConversation(copilotOpen);

  return (
    <div className="app">
      <div className="phone-frame">
        <div className="phone-frame__status-bar">
          <span>9:41</span>
          <span className="phone-frame__status-icons">
            <span aria-hidden="true">●●●</span>
            <span aria-hidden="true">WiFi</span>
            <span aria-hidden="true">🔋</span>
          </span>
        </div>

        <main className="phone-frame__content">
          <PortfolioScreen />
          <CopilotFAB onClick={() => setCopilotOpen(true)} isOpen={copilotOpen} />
        </main>

        <CopilotSheet
          isOpen={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          copilot={copilot}
        />
      </div>
    </div>
  );
}

export default App;
