import { memo, useMemo, type ReactNode } from 'react';
import { useCustomizationStore } from '../../lib/customizationStore';

function formatRatio(ratio: number) {
  return Number.isFinite(ratio) ? ratio.toFixed(2) : '0.00';
}

const PreviewCard = memo(({ title, children }: { title: string; children: ReactNode }) => {
  return (
    <div className="card-surface spacing-stack-sm" aria-label={title} role="group">
      <span className="typography-caption text-text-muted uppercase tracking-wide">{title}</span>
      {children}
    </div>
  );
});
PreviewCard.displayName = 'PreviewCard';

export default function ThemePreview() {
  const { preferences, validateContrast } = useCustomizationStore((state) => ({
    preferences: state.preferences,
    validateContrast: state.validateContrast,
  }));

  const contrast = useMemo(() => {
    return validateContrast(preferences.textColor, preferences.backgroundColor);
  }, [preferences.backgroundColor, preferences.textColor, validateContrast]);

  const contrastStatus = useMemo(() => {
    const passesAAA = contrast >= 7;
    const passesAA = contrast >= 4.5;

    if (passesAAA) {
      return { label: 'AAA compliant', tone: 'text-success' } as const;
    }

    if (passesAA) {
      return { label: 'AA compliant', tone: 'text-warning' } as const;
    }

    return { label: 'Needs improvement', tone: 'text-danger' } as const;
  }, [contrast]);

  return (
    <section className="spacing-stack-lg" aria-label="Live appearance preview">
      <header className="spacing-stack-sm">
        <h2 className="typography-title">Live Preview</h2>
        <p className="typography-body text-text-muted">
          Changes update instantly across representative components. Use this preview to verify accessibility, spacing, and
          hierarchy before applying changes globally.
        </p>
        <div className="spacing-inline-lg items-center">
          <div className="badge">Contrast</div>
          <span className={`typography-body font-semibold ${contrastStatus.tone}`}>
            {formatRatio(contrast)} : 1 • {contrastStatus.label}
          </span>
        </div>
      </header>

      <div className="responsive-grid">
        <PreviewCard title="Primary Actions">
          <div className="spacing-inline-md">
            <button type="button" className="btn-primary">
              Primary Action
            </button>
            <button type="button" className="btn-secondary">
              Secondary
            </button>
            <button type="button" className="btn-ghost">
              Ghost
            </button>
          </div>
        </PreviewCard>

        <PreviewCard title="Informational Card">
          <div className="spacing-stack-sm">
            <h3 className="typography-subtitle">Community Insight</h3>
            <p className="typography-body text-text-muted">
              Maintain a professional, calming tone while highlighting the most important data points. This card adapts across
              orientations and device sizes.
            </p>
            <div className="spacing-inline-sm">
              <span className="badge">Badge</span>
              <span className="badge" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-text-inverse)' }}>
                Accent
              </span>
            </div>
          </div>
        </PreviewCard>

        <PreviewCard title="Form Input">
          <div className="spacing-stack-sm">
            <label className="typography-caption text-text-secondary" htmlFor="preview-input">
              Search communities
            </label>
            <input
              id="preview-input"
              type="text"
              placeholder="Type to search..."
              className="w-full px-4 py-3 rounded-lg border border-border-light focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <span className="typography-caption text-text-muted">Inputs respect density, line-height, and font adjustments.</span>
          </div>
        </PreviewCard>

        <PreviewCard title="Modal">
          <div className="card-surface spacing-stack-sm" style={{ boxShadow: 'var(--shadow-elevation)' }}>
            <h4 className="typography-subtitle">Session Reminder</h4>
            <p className="typography-body text-text-muted">
              Meet your mentor at 4:30 PM. Your layout preferences ensure this critical notification never goes unnoticed.
            </p>
            <div className="spacing-inline-md justify-end">
              <button type="button" className="btn-ghost">
                Dismiss
              </button>
              <button type="button" className="btn-primary">
                View Details
              </button>
            </div>
          </div>
        </PreviewCard>
      </div>
    </section>
  );
}
