import './i18n'        // initialize i18next before React tree
import './index.css'   // Tailwind + CSS tokens
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
