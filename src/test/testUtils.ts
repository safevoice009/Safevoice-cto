import i18n from '../i18n/config';

export function createTestI18n() {
  const testI18n = i18n.cloneInstance({
    lng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

  // Load English translations for testing
  testI18n.addResourceBundle('en', 'translation', {
    zkProof: {
      title: "Privacy Protection",
      description: "Generating cryptographic proof to protect your identity",
      retry: "Retry",
      error: "Proof generation failed",
      verifiedMessage: "Your identity is cryptographically verified and protected",
      generating: "Generating cryptographic proof...",
      verifying: "Verifying proof...",
      status: {
        notStarted: "Not Started",
        pending: "Generating Proof",
        success: "Proof Generated",
        verified: "Verified & Protected",
        failed: "Generation Failed",
        verificationFailed: "Verification Failed"
      }
    }
  });

  return testI18n;
}