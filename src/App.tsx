import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import BottomNav from './components/layout/BottomNav';
import Landing from './pages/Landing';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import { useStore } from './lib/store';

function AnimatedRoutes() {
  const location = useLocation();
  const initStudentId = useStore((state) => state.initStudentId);

  useEffect(() => {
    const storedId = typeof window !== 'undefined' ? localStorage.getItem('studentId') : null;
    if (!storedId) {
      initStudentId();
    }
  }, [initStudentId]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Landing />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.DEV ? '/' : '/Safevoice-cto'}>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
