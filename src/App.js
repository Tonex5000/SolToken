import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletConnectionProvider } from './WalletConnectionProvider';
import SwapButton from './SwapButton';
import './App.css';
import SwapComponent from './SwapComponent';

function App() {
  return (
    <WalletConnectionProvider>
      <div className="App">
        <header className="App-header">
          <WalletMultiButton />
          <SwapComponent />
        </header>
      </div>
    </WalletConnectionProvider>
  );
}

export default App;