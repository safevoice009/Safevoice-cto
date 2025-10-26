import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PostImageProps {
  src: string;
  alt: string;
  onClick: () => void;
}

export default function PostImage({ src, alt, onClick }: PostImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="mb-4 rounded-lg overflow-hidden relative group cursor-pointer">
      {shouldLoad ? (
        <>
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            className={`w-full h-64 object-cover transition-transform duration-500 group-hover:scale-105 ${
              isLoaded ? 'scale-100' : 'scale-105 blur-md'
            }`}
            onClick={onClick}
          />
          <AnimatePresence>
            {!isLoaded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 backdrop-blur-sm bg-black/20"
              />
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="w-full h-64 bg-slate-700/60 animate-pulse" />
      )}
    </div>
  );
}
