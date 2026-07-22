import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { loadFixtureProject } from './fixtures';
import { JourneyPreviewApp } from './preview/JourneyPreviewApp';
import { STORAGE_KEY, clearUndoHistory, useBuilderStore } from './store';
import './index.css';

// `#/preview` opens the whole-application walkthrough instead of the
// builder — same bundle, same localStorage-persisted project.
const isPreviewTab = window.location.hash.startsWith('#/preview');

// Persisted project from a previous session is hydrated automatically by
// the zustand persist middleware. If nothing was saved, seed the bundled
// contact-details / activities / occupier-of-the-land / occupier-details
// fixture so the builder is never empty on first open.
if (typeof window === 'undefined' || !window.localStorage.getItem(STORAGE_KEY)) {
  useBuilderStore.getState().loadProject(loadFixtureProject());
  // Seeding the fixture is the baseline, not an undoable user action.
  clearUndoHistory();
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root in index.html');

createRoot(rootEl).render(
  <StrictMode>{isPreviewTab ? <JourneyPreviewApp /> : <App />}</StrictMode>,
);
