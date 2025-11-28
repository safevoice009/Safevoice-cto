# Privacy Hub Example Component

This document provides an example of how to create a component using the Privacy Hub translation keys.

## Example: Privacy Hub Component

```tsx
import { useTranslation } from 'react-i18next';
import { Shield, HelpCircle, BookOpen } from 'lucide-react';

interface OnboardingStep {
  id: string;
  titleKey: string;
  descriptionKey: string;
}

export function PrivacyHub() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = React.useState(0);

  const onboardingSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      titleKey: 'privacy.hub.onboarding.steps.welcome.title',
      descriptionKey: 'privacy.hub.onboarding.steps.welcome.description'
    },
    {
      id: 'whyPrivacy',
      titleKey: 'privacy.hub.onboarding.steps.whyPrivacy.title',
      descriptionKey: 'privacy.hub.onboarding.steps.whyPrivacy.description'
    },
    {
      id: 'ourApproach',
      titleKey: 'privacy.hub.onboarding.steps.ourApproach.title',
      descriptionKey: 'privacy.hub.onboarding.steps.ourApproach.description'
    },
    {
      id: 'protections',
      titleKey: 'privacy.hub.onboarding.steps.protections.title',
      descriptionKey: 'privacy.hub.onboarding.steps.protections.description'
    },
    {
      id: 'gettingStarted',
      titleKey: 'privacy.hub.onboarding.steps.gettingStarted.title',
      descriptionKey: 'privacy.hub.onboarding.steps.gettingStarted.description'
    }
  ];

  const step = onboardingSteps[currentStep];

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          {t('privacy.hub.title')}
        </h1>
        <p className="text-gray-400">{t('privacy.hub.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-4 border-b border-white/10">
        <button
          className="pb-3 px-4 text-white border-b-2 border-primary"
        >
          <BookOpen className="w-4 h-4 inline mr-2" />
          {t('privacy.hub.faq.title')}
        </button>
        <button className="pb-3 px-4 text-gray-400 hover:text-white">
          <HelpCircle className="w-4 h-4 inline mr-2" />
          {t('privacy.hub.onboarding.title')}
        </button>
      </div>

      {/* FAQ Section Example */}
      <div className="space-y-4">
        <div className="bg-surface/50 p-4 rounded-lg border border-white/10">
          <h3 className="font-semibold text-white mb-2">
            {t('privacy.hub.faq.questions.whatIsTracking.q')}
          </h3>
          <p className="text-gray-400">
            {t('privacy.hub.faq.questions.whatIsTracking.a')}
          </p>
        </div>

        <div className="bg-surface/50 p-4 rounded-lg border border-white/10">
          <h3 className="font-semibold text-white mb-2">
            {t('privacy.hub.faq.questions.howProtected.q')}
          </h3>
          <p className="text-gray-400">
            {t('privacy.hub.faq.questions.howProtected.a')}
          </p>
        </div>

        <div className="bg-surface/50 p-4 rounded-lg border border-white/10">
          <h3 className="font-semibold text-white mb-2">
            {t('privacy.hub.faq.questions.cookiesUsed.q')}
          </h3>
          <p className="text-gray-400">
            {t('privacy.hub.faq.questions.cookiesUsed.a')}
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-8 flex gap-4">
        <button className="btn btn-primary">
          {t('privacy.hub.cta.learnMore')}
        </button>
        <button className="btn btn-secondary">
          {t('privacy.hub.cta.visitSettings')}
        </button>
      </div>
    </div>
  );
}
```

## Example: Onboarding Stepper

```tsx
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PrivacyOnboarding() {
  const { t } = useTranslation();
  const [step, setStep] = React.useState(0);

  const steps = [
    'welcome',
    'whyPrivacy',
    'ourApproach',
    'protections',
    'gettingStarted'
  ];

  const currentStepKey = steps[step];

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex gap-2">
        {steps.map((_, idx) => (
          <div
            key={idx}
            className={`h-2 flex-1 rounded ${
              idx <= step ? 'bg-primary' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">
          {t(`privacy.hub.onboarding.steps.${currentStepKey}.title`)}
        </h2>
        <p className="text-gray-400">
          {t(`privacy.hub.onboarding.steps.${currentStepKey}.description`)}
        </p>
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <button
          onClick={() => setStep(Math.max(0, step - 1))}
          disabled={step === 0}
          className="btn btn-secondary flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('privacy.hub.cta.previousStep')}
        </button>

        {step === steps.length - 1 ? (
          <button className="btn btn-primary">
            {t('privacy.hub.cta.completeOnboarding')}
          </button>
        ) : (
          <button
            onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
            className="btn btn-primary flex items-center gap-2"
          >
            {t('privacy.hub.cta.nextStep')}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
```

## Using Diagram Translations

```tsx
export function PrivacyDiagrams() {
  const { t } = useTranslation();

  const diagrams = [
    { id: 'tracking', icon: Activity },
    { id: 'fingerprinting', icon: Fingerprint },
    { id: 'dataFlow', icon: Database },
    { id: 'protection', icon: Shield }
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {diagrams.map(({ id, icon: Icon }) => (
        <div key={id} className="bg-surface rounded-lg p-6">
          <Icon className="w-8 h-8 mb-3 text-primary" />
          <h3 className="font-semibold text-white mb-2">
            {t(`privacy.hub.diagrams.${id}.title`)}
          </h3>
          <p className="text-sm text-gray-400">
            {t(`privacy.hub.diagrams.${id}.description`)}
          </p>
        </div>
      ))}
    </div>
  );
}
```

## Translation Key Reference

### Diagrams
- `privacy.hub.diagrams.tracking.title/description`
- `privacy.hub.diagrams.fingerprinting.title/description`
- `privacy.hub.diagrams.dataFlow.title/description`
- `privacy.hub.diagrams.protection.title/description`

### FAQ Questions
- `privacy.hub.faq.questions.whatIsTracking.q/a`
- `privacy.hub.faq.questions.howProtected.q/a`
- `privacy.hub.faq.questions.canIBeAnonymous.q/a`
- `privacy.hub.faq.questions.whatIsFingerprinting.q/a`
- `privacy.hub.faq.questions.cookiesUsed.q/a`
- `privacy.hub.faq.questions.dataSharing.q/a`

### Onboarding Steps
- `privacy.hub.onboarding.steps.welcome.title/description`
- `privacy.hub.onboarding.steps.whyPrivacy.title/description`
- `privacy.hub.onboarding.steps.ourApproach.title/description`
- `privacy.hub.onboarding.steps.protections.title/description`
- `privacy.hub.onboarding.steps.gettingStarted.title/description`

### CTAs (Call-to-Action)
- `privacy.hub.cta.learnMore`
- `privacy.hub.cta.readFaq`
- `privacy.hub.cta.visitSettings`
- `privacy.hub.cta.enableProtection`
- `privacy.hub.cta.startOnboarding`
- `privacy.hub.cta.closeHub`
- `privacy.hub.cta.backToDashboard`
- `privacy.hub.cta.nextStep`
- `privacy.hub.cta.previousStep`
- `privacy.hub.cta.skipOnboarding`
- `privacy.hub.cta.completeOnboarding`

## Best Practices

1. **Always use `useTranslation` hook**: Ensures automatic updates on language change
2. **Test in all languages**: Verify translations display correctly in your layout
3. **Use template strings for dynamic keys**: `t(\`privacy.hub.diagrams.\${type}.title\`)`
4. **Provide fallback UI**: Always show something meaningful if translation is missing
5. **Keep keys consistent**: Don't create variations of the same content

## Handling Missing Translations

While the system falls back to English automatically, you can also explicitly handle missing translations:

```tsx
export function SafeComponent() {
  const { t } = useTranslation();

  // Safe: Will use English if translation missing
  const title = t('privacy.hub.title', 'Privacy Hub');

  // Safe: Custom fallback
  const custom = t('privacy.hub.custom', 'Custom Privacy Hub');

  return <h1>{title}</h1>;
}
```
