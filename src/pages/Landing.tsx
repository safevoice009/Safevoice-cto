import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Helplines from '../components/landing/Helplines';
import Memorial from '../components/landing/Memorial';
import CTASection from '../components/landing/CTASection';

export default function Landing() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as { scrollTo?: string } | null;
    if (state?.scrollTo) {
      const timeout = setTimeout(() => {
        const target = document.getElementById(state.scrollTo!);
        target?.scrollIntoView({ behavior: 'smooth' });
        navigate(location.pathname, { replace: true, state: undefined });
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, [location, navigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Hero />
      <Features />
      <Helplines />
      <Memorial />
      <CTASection />
    </motion.div>
  );
}
