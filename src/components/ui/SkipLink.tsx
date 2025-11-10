import { motion } from 'framer-motion';

interface SkipLinkProps {
  targetId: string;
  className?: string;
  children?: React.ReactNode;
}

export default function SkipLink({ 
  targetId, 
  className = '', 
  children = 'Skip to main content' 
}: SkipLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const targetElement = document.getElementById(targetId);
    
    if (targetElement) {
      targetElement.focus();
      targetElement.scrollIntoView({ behavior: 'smooth' });
      
      // Add a temporary visual indicator
      targetElement.setAttribute('data-skip-link-target', 'true');
      setTimeout(() => {
        targetElement.removeAttribute('data-skip-link-target');
      }, 2000);
    }
  };

  return (
    <motion.a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
        bg-primary text-white px-4 py-2 rounded-lg font-medium z-50
        focus:outline-none focus:ring-4 focus:ring-primary/50
        transition-all duration-200
        ${className}
      `}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {children}
    </motion.a>
  );
}