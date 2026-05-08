import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { loadFixtureProject } from './fixtures';
import { STORAGE_KEY, useBuilderStore } from './store';
import './index.css';

// Persisted project from a previous session is hydrated automatically by
// the zustand persist middleware. If nothing was saved, seed the bundled
// contact-details / activities / occupier-of-the-land / occupier-details
// fixture so the builder is never empty on first open.
if (typeof window === 'undefined' || !window.localStorage.getItem(STORAGE_KEY)) {
  useBuilderStore.getState().loadProject(loadFixtureProject());
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
