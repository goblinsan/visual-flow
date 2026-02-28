import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CanvasApp from './CanvasApp'
import ProposalsTestPage from './ProposalsTestPage'
import FromKulrsPage from './FromKulrsPage'

// Route based on URL
const isTestPage = window.location.search.includes('test=proposals');
const isFromKulrs = window.location.pathname === '/from-kulrs';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isFromKulrs ? <FromKulrsPage /> : isTestPage ? <ProposalsTestPage /> : <CanvasApp />}
  </StrictMode>,
)
