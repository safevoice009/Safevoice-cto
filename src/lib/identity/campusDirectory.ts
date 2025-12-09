/**
 * Campus Directory Service
 * 
 * Maintains allowlisted .edu domains and their DKIM public keys
 * for zero-knowledge student verification.
 */

import type { CampusDirectoryEntry } from './types';

/**
 * Pre-configured campus directory with DKIM selectors
 * Note: Public keys would normally be fetched from DNS TXT records
 */
const CAMPUS_DIRECTORY: CampusDirectoryEntry[] = [
  // US Universities
  {
    domain: 'stanford.edu',
    institutionName: 'Stanford University',
    dkimSelector: 'google',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC', // Truncated for example
    isActive: true,
    countryCode: 'US',
  },
  {
    domain: 'mit.edu',
    institutionName: 'Massachusetts Institute of Technology',
    dkimSelector: 'selector1',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQD',
    isActive: true,
    countryCode: 'US',
  },
  {
    domain: 'berkeley.edu',
    institutionName: 'University of California, Berkeley',
    dkimSelector: 'google',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQE',
    isActive: true,
    countryCode: 'US',
  },
  {
    domain: 'harvard.edu',
    institutionName: 'Harvard University',
    dkimSelector: 'google',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQF',
    isActive: true,
    countryCode: 'US',
  },
  {
    domain: 'yale.edu',
    institutionName: 'Yale University',
    dkimSelector: 'google',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQG',
    isActive: true,
    countryCode: 'US',
  },
  {
    domain: 'princeton.edu',
    institutionName: 'Princeton University',
    dkimSelector: 'selector1',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQH',
    isActive: true,
    countryCode: 'US',
  },
  {
    domain: 'columbia.edu',
    institutionName: 'Columbia University',
    dkimSelector: 'google',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQI',
    isActive: true,
    countryCode: 'US',
  },
  {
    domain: 'upenn.edu',
    institutionName: 'University of Pennsylvania',
    dkimSelector: 'selector1',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQJ',
    isActive: true,
    countryCode: 'US',
  },
  // Indian Universities
  {
    domain: 'iitb.ac.in',
    institutionName: 'Indian Institute of Technology Bombay',
    dkimSelector: 'google',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQK',
    isActive: true,
    countryCode: 'IN',
  },
  {
    domain: 'iitd.ac.in',
    institutionName: 'Indian Institute of Technology Delhi',
    dkimSelector: 'google',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQL',
    isActive: true,
    countryCode: 'IN',
  },
  {
    domain: 'iisc.ac.in',
    institutionName: 'Indian Institute of Science',
    dkimSelector: 'default',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQM',
    isActive: true,
    countryCode: 'IN',
  },
  // UK Universities
  {
    domain: 'ox.ac.uk',
    institutionName: 'University of Oxford',
    dkimSelector: 'selector1',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQN',
    isActive: true,
    countryCode: 'GB',
  },
  {
    domain: 'cam.ac.uk',
    institutionName: 'University of Cambridge',
    dkimSelector: 'selector1',
    dkimPublicKey: 'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQO',
    isActive: true,
    countryCode: 'GB',
  },
  // Generic .edu pattern matcher
  {
    domain: '*.edu',
    institutionName: 'Generic US Educational Institution',
    dkimSelector: 'google',
    dkimPublicKey: '',
    isActive: true,
    countryCode: 'US',
  },
];

/**
 * Campus Directory Service class
 */
class CampusDirectoryService {
  private entries: Map<string, CampusDirectoryEntry>;
  private eduPattern: RegExp;

  constructor() {
    this.entries = new Map();
    this.eduPattern = /^[a-zA-Z0-9.-]+\.(edu|ac\.[a-z]{2})$/;
    
    // Load initial entries
    CAMPUS_DIRECTORY.forEach(entry => {
      if (entry.domain !== '*.edu') {
        this.entries.set(entry.domain.toLowerCase(), entry);
      }
    });
  }

  /**
   * Check if a domain is an educational institution
   */
  isEducationalDomain(domain: string): boolean {
    const normalizedDomain = domain.toLowerCase().trim();
    
    // Check exact match first
    if (this.entries.has(normalizedDomain)) {
      return this.entries.get(normalizedDomain)?.isActive ?? false;
    }
    
    // Check pattern match (.edu or .ac.xx)
    return this.eduPattern.test(normalizedDomain);
  }

  /**
   * Get campus entry by domain
   */
  getEntry(domain: string): CampusDirectoryEntry | null {
    const normalizedDomain = domain.toLowerCase().trim();
    return this.entries.get(normalizedDomain) ?? null;
  }

  /**
   * Get DKIM selector for a domain
   */
  getDKIMSelector(domain: string): string | null {
    const entry = this.getEntry(domain);
    if (entry) {
      return entry.dkimSelector;
    }
    
    // Default selector for unknown .edu domains
    if (this.isEducationalDomain(domain)) {
      return 'google';
    }
    
    return null;
  }

  /**
   * Get DKIM public key for a domain
   */
  getDKIMPublicKey(domain: string): string | null {
    const entry = this.getEntry(domain);
    return entry?.dkimPublicKey ?? null;
  }

  /**
   * Get all active domains
   */
  getActiveDomains(): string[] {
    return Array.from(this.entries.values())
      .filter(e => e.isActive)
      .map(e => e.domain);
  }

  /**
   * Get domains by country
   */
  getDomainsByCountry(countryCode: string): CampusDirectoryEntry[] {
    return Array.from(this.entries.values())
      .filter(e => e.countryCode === countryCode && e.isActive);
  }

  /**
   * Extract domain from email address
   */
  extractDomain(email: string): string | null {
    const match = email.match(/@([a-zA-Z0-9.-]+)$/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Validate email format and educational domain
   */
  validateEducationalEmail(email: string): {
    valid: boolean;
    domain?: string;
    institutionName?: string;
    error?: string;
  } {
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    const domain = this.extractDomain(email);
    if (!domain) {
      return { valid: false, error: 'Could not extract domain' };
    }

    if (!this.isEducationalDomain(domain)) {
      return { valid: false, error: 'Not an educational domain' };
    }

    const entry = this.getEntry(domain);
    return {
      valid: true,
      domain,
      institutionName: entry?.institutionName ?? 'Educational Institution',
    };
  }

  /**
   * Add a new campus entry (for admin use)
   */
  addEntry(entry: CampusDirectoryEntry): void {
    this.entries.set(entry.domain.toLowerCase(), entry);
  }

  /**
   * Deactivate a campus entry
   */
  deactivateEntry(domain: string): boolean {
    const entry = this.entries.get(domain.toLowerCase());
    if (entry) {
      entry.isActive = false;
      return true;
    }
    return false;
  }

  /**
   * Get entry count
   */
  getEntryCount(): number {
    return this.entries.size;
  }

  /**
   * Get active entry count
   */
  getActiveEntryCount(): number {
    return Array.from(this.entries.values()).filter(e => e.isActive).length;
  }
}

// Singleton instance
export const campusDirectory = new CampusDirectoryService();

// Export class for testing
export { CampusDirectoryService };
