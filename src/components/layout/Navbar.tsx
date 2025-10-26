import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Menu, X, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';
import toast from 'react-hot-toast';

type NavLink = {
  name: string;
  value: string;
  type: 'route' | 'scroll';
};

const navLinks: NavLink[] = [
  { name: 'Feed', value: '/feed', type: 'route' },
  { name: 'Communities', value: 'features', type: 'scroll' },
  { name: 'Helplines', value: 'helplines', type: 'scroll' },
  { name: 'Memorial', value: 'memorial', type: 'scroll' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollYRef = useRef(0);
  const { studentId } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const controlNavbar = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > lastScrollYRef.current && currentScroll > 100) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollYRef.current = currentScroll;
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, []);

  const handleWalletConnect = () => {
    toast.success('Wallet connection coming soon!');
  };

  const closeMenu = () => setIsOpen(false);

  const scrollToSection = useCallback((sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleNavClick = (link: NavLink) => {
    closeMenu();

    if (link.type === 'route') {
      navigate(link.value);
      return;
    }

    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: link.value } });
    } else {
      scrollToSection(link.value);
    }
  };

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -100 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2" onClick={closeMenu}>
            <Lock className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold text-white">SafeVoice</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link)}
                className="nav-link"
                type="button"
              >
                {link.name}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <span className="text-primary font-medium">{studentId}</span>
            <motion.button
              onClick={handleWalletConnect}
              className="flex items-center space-x-2 btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Wallet</span>
            </motion.button>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-surface/95 backdrop-blur-xl border-t border-white/10"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => handleNavClick(link)}
                  className="block w-full text-left nav-link py-2"
                  type="button"
                >
                  {link.name}
                </button>
              ))}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="text-primary font-medium">{studentId}</div>
                <motion.button
                  onClick={() => {
                    handleWalletConnect();
                    closeMenu();
                  }}
                  className="w-full flex items-center justify-center space-x-2 btn-primary"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Connect Wallet</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
