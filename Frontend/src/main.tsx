import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
import { CanvasProvider } from './contexts/CanvasContext'
import { TableauProvider } from './contexts/TableauContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <TableauProvider>
        <ChatProvider>
          <CanvasProvider>
            <App />
          </CanvasProvider>
        </ChatProvider>
      </TableauProvider>
    </AuthProvider>
  </StrictMode>,
)
