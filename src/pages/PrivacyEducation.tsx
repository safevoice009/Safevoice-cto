import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import PrivacyHero from '../components/privacy/PrivacyHero';
import PrivacyFeaturesGrid from '../components/privacy/PrivacyFeaturesGrid';
import DataFlowDiagram from '../components/privacy/DataFlowDiagram';
import PrivacyFAQAccordion from '../components/privacy/PrivacyFAQAccordion';
import PrivacyCTA from '../components/privacy/PrivacyCTA';

interface TableOfContents {
  id: string;
  label: string;
  offset: number;
}

export default function PrivacyEducationPage() {
  const [activeSection, setActiveSection] = useState<string>('');
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Privacy Education Hub | SafeVoice';
  }, []);

  // Observe sections for active link highlighting
  useEffect(() => {
    const observerOptions = {
      threshold: 0.5,
      rootMargin: '-50px 0px -50% 0px',
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    const sections = [heroRef, featuresRef, diagramRef, faqRef, ctaRef];
    sections.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current);
      }
    });

    return () => observer.disconnect();
  }, []);

  const tableOfContents: TableOfContents[] = [
    { id: 'hero', label: 'Privacy First', offset: 0 },
    { id: 'features', label: 'Features', offset: 0 },
    { id: 'diagram', label: 'Data Flow', offset: 0 },
    { id: 'faq', label: 'FAQ', offset: 0 },
    { id: 'cta', label: 'Get Started', offset: 0 },
  ];

  const scrollToSection = (id: string) => {
    const ref = {
      hero: heroRef,
      features: featuresRef,
      diagram: diagramRef,
      faq: faqRef,
      cta: ctaRef,
    }[id];

    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-24 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded"
      >
        Skip to main content
      </a>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Anchored Navigation */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-24 z-40 mb-12 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-background/80 backdrop-blur-lg border-b border-white/10"
          role="navigation"
          aria-label="Page navigation"
        >
          <div className="max-w-6xl mx-auto">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">
              Navigation
            </p>
            <div className="flex flex-wrap gap-2">
              {tableOfContents.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeSection === item.id
                      ? 'bg-primary text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                  aria-current={activeSection === item.id ? 'page' : undefined}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </motion.nav>

        {/* Main Content */}
        <main
          id="main-content"
          className="space-y-16"
          role="main"
        >
          {/* Hero Section */}
          <section id="hero" ref={heroRef} className="scroll-mt-24">
            <PrivacyHero />
          </section>

          {/* Features Grid */}
          <section
            id="features"
            ref={featuresRef}
            className="scroll-mt-24"
            aria-labelledby="features-heading"
          >
            <h2 id="features-heading" className="sr-only">
              Privacy Features
            </h2>
            <PrivacyFeaturesGrid />
          </section>

          {/* Data Flow Diagram */}
          <section
            id="diagram"
            ref={diagramRef}
            className="scroll-mt-24"
            aria-labelledby="diagram-heading"
          >
            <h2 id="diagram-heading" className="sr-only">
              Data Flow Diagram
            </h2>
            <DataFlowDiagram />
          </section>

          {/* FAQ Accordion */}
          <section
            id="faq"
            ref={faqRef}
            className="scroll-mt-24"
            aria-labelledby="faq-heading"
          >
            <h2 id="faq-heading" className="sr-only">
              Frequently Asked Questions
            </h2>
            <PrivacyFAQAccordion />
          </section>

          {/* Call-to-Action Section */}
          <section
            id="cta"
            ref={ctaRef}
            className="scroll-mt-24"
            aria-labelledby="cta-heading"
          >
            <h2 id="cta-heading" className="sr-only">
              Get Started
            </h2>
            <PrivacyCTA />
          </section>
        </main>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-20 pt-8 border-t border-white/10 text-center space-y-3 text-gray-400 text-sm"
        >
          <p>
            Your privacy is not a feature—it's a fundamental right. At SafeVoice, we've built
            privacy into everything we do.
          </p>
          <p>
            Have more questions? Visit our{' '}
            <a
              href="/guidelines"
              className="text-primary hover:underline"
            >
              Community Guidelines
            </a>{' '}
            or{' '}
            <a
              href="/helplines"
              className="text-primary hover:underline"
            >
              Crisis Support
            </a>
            .
          </p>
          <p className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
