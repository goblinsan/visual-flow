import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CanvasApp from './CanvasApp'
import ProposalsTestPage from './ProposalsTestPage'

// Check URL for test page
const isTestPage = window.location.search.includes('test=proposals');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isTestPage ? <ProposalsTestPage /> : <CanvasApp />}
  </StrictMode>,
)
