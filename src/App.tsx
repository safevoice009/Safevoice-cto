import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import BottomNav from './components/layout/BottomNav';
import Landing from './pages/Landing';
import Feed from './pages/Feed';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail';
import HelplinesPage from './pages/Helplines';
import GuidelinesPage from './pages/Guidelines';
import MemorialWallPage from './pages/MemorialWall';
import TokenMarketplace from './pages/TokenMarketplace';
import LeaderboardPage from './pages/Leaderboard';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import CommunitiesPage from './pages/Communities';
import SearchPage from './pages/Search';
import AppearanceSettings from './components/settings/AppearanceSettings';
import ResponsiveLayout from './components/responsive/ResponsiveLayout';
import CrisisAlertModal from './components/crisis/CrisisAlertModal';
import AchievementToastContainer from './components/wallet/AchievementToastContainer';
import { useStore } from './lib/store';
import PostLifecycleManager from './lib/postLifecycleManager';
import { wagmiConfig, chains } from './lib/wagmiConfig';
import { useThemeStore } from './lib/themeStore';
import { useCustomizationStore } from './lib/customizationStore';
import { ThemeProvider } from './components/ui/ThemeProvider';
import { useThemeSystemStore } from './lib/themeSystemStore';

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  const initStudentId = useStore((state) => state.initStudentId);
  const showCrisisModal = useStore((state) => state.showCrisisModal);
  const setShowCrisisModal = useStore((state) => state.setShowCrisisModal);
  const pendingPost = useStore((state) => state.pendingPost);
  const setPendingPost = useStore((state) => state.setPendingPost);
  const addPost = useStore((state) => state.addPost);
  const loadWalletData = useStore((state) => state.loadWalletData);
  const grantDailyLoginBonus = useStore((state) => state.grantDailyLoginBonus);
  const hydrateTheme = useThemeStore((state) => state.hydrate);
  const hydrateAppearance = useCustomizationStore((state) => state.hydrate);
  const hydrateThemeSystem = useThemeSystemStore((state) => state.hydrate);
  const lifecycleManagerRef = useRef<PostLifecycleManager | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const storedId = typeof window !== 'undefined' ? localStorage.getItem('studentId') : null;
    if (!storedId) {
      initStudentId();
    }
    hydrateTheme();
    hydrateAppearance();
    hydrateThemeSystem();
  }, [initStudentId, hydrateTheme, hydrateAppearance, hydrateThemeSystem]);

  useEffect(() => {
    loadWalletData();
    grantDailyLoginBonus();
  }, [loadWalletData, grantDailyLoginBonus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    lifecycleManagerRef.current = new PostLifecycleManager(useStore);
    lifecycleManagerRef.current.start();

    return () => {
      lifecycleManagerRef.current?.stop();
    };
  }, []);

  const handleCrisisAcknowledge = (action: 'call_helpline' | 'continue') => {
    if (action === 'call_helpline') {
      toast.success(t('crisis.thankYou'));
    }

    if (pendingPost && pendingPost.moderationData) {
      addPost(
        pendingPost.content,
        pendingPost.category,
        pendingPost.lifetime,
        pendingPost.customLifetimeHours || undefined,
        pendingPost.isEncrypted,
        pendingPost.encryptionData,
        pendingPost.moderationData,
        pendingPost.imageUrl,
        pendingPost.communityId
          ? {
              communityId: pendingPost.communityId ?? undefined,
              channelId: pendingPost.channelId ?? undefined,
              visibility: pendingPost.visibility,
              isAnonymous: pendingPost.isAnonymous,
            }
          : undefined,
        pendingPost.emotionAnalysis ?? null,
        pendingPost.ipfsCid ?? undefined
      );
    }

    setShowCrisisModal(false);
    setPendingPost(null);
  };

  return (
    <ResponsiveLayout
      header={<Navbar />}
      footer={<Footer />}
      bottomNavigation={<BottomNav />}
      mainProps={{ className: 'pt-24 pb-16' }}
    >
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/post/:postId" element={<PostDetail />} />
          <Route path="/helplines" element={<HelplinesPage />} />
          <Route path="/guidelines" element={<GuidelinesPage />} />
          <Route path="/memorial" element={<MemorialWallPage />} />
          <Route path="/marketplace" element={<TokenMarketplace />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/transactions" element={<TransactionHistoryPage />} />
          <Route path="/settings/appearance" element={<AppearanceSettings />} />
        </Routes>
      </AnimatePresence>
      <AchievementToastContainer />
      <CrisisAlertModal
        isOpen={showCrisisModal}
        onAcknowledge={handleCrisisAcknowledge}
      />
    </ResponsiveLayout>
  );
}

export default function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains} coolMode>
          <BrowserRouter basename={import.meta.env.DEV ? '/' : '/Safevoice-cto'}>
            <ThemeProvider>
              <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
              <AnimatedRoutes />
            </ThemeProvider>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}
