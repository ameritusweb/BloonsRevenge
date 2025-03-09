import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import BloonsRevenge from './components/BloonsRevenge'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="w-full h-screen bg-gray-900 flex items-center justify-center">
      <BloonsRevenge />
    </div>
  </StrictMode>,
)