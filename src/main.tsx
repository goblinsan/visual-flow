import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CanvasApp from './CanvasApp'
import ProposalsTestPage from './ProposalsTestPage'
import FromKulrsPage from './FromKulrsPage'
import StyleFlowTestPage from './StyleFlowTestPage'
import { MobileFlowShell } from './mobile/MobileFlowShell'
import { useMobile } from './hooks/useMobile'
import type { MobileDesignSnapshot } from './mobile/types'

// Route based on URL
const isTestPage = window.location.search.includes('test=proposals');
const isStyleFlowTest = window.location.search.includes('test=styleflow');
const isFromKulrs = window.location.pathname === '/from-kulrs';

/**
 * Root component.
 * On mobile/touch devices the full canvas editor is replaced with the
 * simplified, guided MobileFlowShell.  Desktop users continue to get the
 * existing CanvasApp (or test/import pages) as before.
 */
function Root() {
  const isMobile = useMobile();

  if (isFromKulrs) return <FromKulrsPage />;
  if (isTestPage)  return <ProposalsTestPage />;
  if (isStyleFlowTest) return <StyleFlowTestPage />;

  if (isMobile) {
    const handleMobileComplete = (_snapshot: MobileDesignSnapshot) => {
      // The MobileFlowShell manages its own "done" step internally.
      // The snapshot is available here if the host app needs to persist it
      // (e.g. save to localStorage or trigger a server call).
    };
    return <MobileFlowShell onComplete={handleMobileComplete} />;
  }

  return <CanvasApp />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
