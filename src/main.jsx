import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './styles.css'

// registerType: 'autoUpdate' no vite.config.js já faz o service worker assumir
// sozinho assim que uma nova versão termina de baixar — não precisa de prompt
// nem de lógica de reload manual aqui.
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
