import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import CanvasApp from './CanvasApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CanvasApp />
  </StrictMode>,
)
