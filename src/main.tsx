import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { StorageService } from './services/storage';

// StorageService.ready() hydrates the persisted-settings cache from
// @capacitor/preferences ONCE, before the app mounts for the first time.
// Everything the app reads synchronously today (favorites, vault config,
// theme, premium status, etc.) keeps working exactly as before -- this is
// the only place that has to know the read is now backed by Preferences
// instead of localStorage. This adds a few milliseconds before first
// paint at most; it does not touch media scanning, thumbnail loading, or
// grid scrolling at all.
StorageService.ready().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
