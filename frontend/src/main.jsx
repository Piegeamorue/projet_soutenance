import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId="564138300597-04t69lcgk3d0lr213agblas8kham88qf.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
)