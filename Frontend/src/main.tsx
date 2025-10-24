import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
import { CanvasProvider } from './contexts/CanvasContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ChatProvider>
        <CanvasProvider>
          <App />
        </CanvasProvider>
      </ChatProvider>
    </AuthProvider>
  </StrictMode>,
)
