import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import AutoCompleteDropDown from './components/AutoCompleteDropdown.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />

  </StrictMode>,
)
