import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)

// Service worker yalnızca üretimde kaydediliyor: geliştirme sırasında
// kayıtlı bir worker, kaynak değişikliklerinin görünmemesi gibi kafa
// karıştırıcı durumlara yol açıyor. Kurulabilirlik zaten canlıda gerekli.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // Kayıt başarısız olursa uygulama normal web sitesi olarak çalışmaya
      // devam eder; yalnızca "ana ekrana ekle" önerisi çıkmaz.
      console.error('Service worker kaydedilemedi:', error);
    });
  });
}
