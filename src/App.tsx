import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import BottomNav from './components/layout/BottomNav';
import Landing from './pages/Landing';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail';
import { useStore } from './lib/store';
import PostLifecycleManager from './lib/postLifecycleManager';

function AnimatedRoutes() {
  const location = useLocation();
  const initStudentId = useStore((state) => state.initStudentId);
  const lifecycleManagerRef = useRef<PostLifecycleManager | null>(null);

  useEffect(() => {
    const storedId = typeof window !== 'undefined' ? localStorage.getItem('studentId') : null;
    if (!storedId) {
      initStudentId();
    }
  }, [initStudentId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    lifecycleManagerRef.current = new PostLifecycleManager(useStore);
    lifecycleManagerRef.current.start();

    return () => {
      lifecycleManagerRef.current?.stop();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Landing />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/post/:postId" element={<PostDetail />} />
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
