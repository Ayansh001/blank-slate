import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PWAManager } from './utils/pwa'
import { offlineStorage } from './utils/offlineStorage'
import { AppearanceProvider } from './providers/AppearanceProvider'

// Initialize PWA features
PWAManager.getInstance().initialize();
offlineStorage.initialize();

createRoot(document.getElementById("root")!).render(
  <AppearanceProvider>
    <App />
  </AppearanceProvider>
);
