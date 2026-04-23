import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CanvasApp from './CanvasApp'
import ProposalsTestPage from './ProposalsTestPage'
import FromKulrsPage from './FromKulrsPage'
import StyleFlowTestPage from './StyleFlowTestPage'
import { MobileFlowShell } from './mobile/MobileFlowShell'
import { MobileGate } from './mobile/MobileGate'
import { useMobile } from './hooks/useMobile'
import { saveMobileSnapshot } from './utils/persistence'
import { SvgEditor } from './svg-editor/SvgEditor'

// Route based on URL
const isTestPage = window.location.search.includes('test=proposals');
const isStyleFlowTest = window.location.search.includes('test=styleflow');
const isFromKulrs = window.location.pathname === '/from-kulrs';
// Issue #210: explicit ?editor=mobile param forces the mobile shell regardless of device
const forceMobile = window.location.search.includes('editor=mobile');
const isSvgEditor = window.location.search.includes('editor=svg');

/**
 * Root component.
 * On mobile/touch devices the full canvas editor is replaced with the
 * simplified, guided MobileFlowShell.  Desktop users continue to get the
 * existing CanvasApp (or test/import pages) as before.
 *
 * Routing priority:
 *  1. ?editor=mobile  → always serve MobileFlowShell (Issue #210)
 *  2. /from-kulrs, test pages → existing routes unchanged
 *  3. isMobile (useMobile hook) → MobileFlowShell (Issue #209)
 *  4. Desktop → CanvasApp wrapped in MobileGate (Issue #209)
 */
function Root() {
  const isMobile = useMobile();

  if (isFromKulrs) return <FromKulrsPage />;
  if (isTestPage)  return <ProposalsTestPage />;
  if (isStyleFlowTest) return <StyleFlowTestPage />;
  if (isSvgEditor) return <SvgEditor />;

  if (forceMobile || isMobile) {
    return <MobileFlowShell onComplete={(snapshot) => saveMobileSnapshot(snapshot)} />;
  }

  // Issue #209: MobileGate ensures canvas never renders on mobile even if
  // routing somehow reaches this branch (e.g. during orientation changes).
  return (
    <MobileGate>
      <CanvasApp />
    </MobileGate>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
