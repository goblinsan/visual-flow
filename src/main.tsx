import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CanvasApp from './CanvasApp'
import ProposalsTestPage from './ProposalsTestPage'
import FromKulrsPage from './FromKulrsPage'
import StyleFlowTestPage from './StyleFlowTestPage'

// Route based on URL
const isTestPage = window.location.search.includes('test=proposals');
const isStyleFlowTest = window.location.search.includes('test=styleflow');
const isFromKulrs = window.location.pathname === '/from-kulrs';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isFromKulrs ? <FromKulrsPage /> : isTestPage ? <ProposalsTestPage /> : isStyleFlowTest ? <StyleFlowTestPage /> : <CanvasApp />}
  </StrictMode>,
)
