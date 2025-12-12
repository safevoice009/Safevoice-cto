/**
 * Known institutional network profiles for auto-detection.
 * Used by InstitutionNetworkDetector to identify campus Wi-Fi and trigger Tor mode.
 */

export interface CollegeNetworkProfile {
  /** Unique identifier for this network profile */
  id: string;
  /** Human-readable institution name */
  name: string;
  /** Array of SSID patterns (supports wildcards via regex) */
  ssidPatterns: string[];
  /** Array of BSSID prefixes (MAC address vendor prefixes) */
  bssidPrefixes: string[];
  /** DNS suffix patterns commonly used by this institution */
  dnsSuffixes: string[];
  /** Keywords to look for in captive portal responses */
  portalKeywords: string[];
  /** UI badge label to display when this network is detected */
  badgeLabel: string;
}

/**
 * Known college and university network profiles.
 * Add new profiles here as needed for specific institutions.
 */
export const COLLEGE_NETWORK_PROFILES: CollegeNetworkProfile[] = [
  {
    id: 'mit',
    name: 'MIT',
    ssidPatterns: ['MIT', 'MIT SECURE', 'MIT-GUEST'],
    bssidPrefixes: ['00:1f:ca', '00:23:68'],
    dnsSuffixes: ['mit.edu'],
    portalKeywords: ['massachusetts institute of technology', 'mit.edu', 'MIT IS&T'],
    badgeLabel: 'MIT Network',
  },
  {
    id: 'stanford',
    name: 'Stanford University',
    ssidPatterns: ['Stanford', 'Stanford_Residences', 'Stanford_Guest'],
    bssidPrefixes: ['00:1d:7e', '00:27:0d'],
    dnsSuffixes: ['stanford.edu'],
    portalKeywords: ['stanford university', 'stanford.edu', 'SUNet'],
    badgeLabel: 'Stanford Network',
  },
  {
    id: 'iit-bombay',
    name: 'IIT Bombay',
    ssidPatterns: ['IITB-Campus', 'IITB-Guest', 'IITB-Students'],
    bssidPrefixes: ['00:1a:1e', '00:23:ab'],
    dnsSuffixes: ['iitb.ac.in'],
    portalKeywords: ['iit bombay', 'iitb.ac.in', 'Computer Centre'],
    badgeLabel: 'IIT Bombay Network',
  },
  {
    id: 'ucla',
    name: 'UCLA',
    ssidPatterns: ['UCLA_WEB', 'UCLA_SECURE'],
    bssidPrefixes: ['00:21:1b', '00:24:97'],
    dnsSuffixes: ['ucla.edu'],
    portalKeywords: ['ucla', 'university of california', 'ucla.edu'],
    badgeLabel: 'UCLA Network',
  },
  {
    id: 'nit-trichy',
    name: 'NIT Trichy',
    ssidPatterns: ['NITT-CAMPUS', 'NITT-GUEST', 'NITT-Students'],
    bssidPrefixes: ['00:1b:2f', '00:22:6b'],
    dnsSuffixes: ['nitt.edu'],
    portalKeywords: ['nit trichy', 'nitt.edu', 'National Institute of Technology'],
    badgeLabel: 'NIT Trichy Network',
  },
  {
    id: 'eduroam',
    name: 'Eduroam',
    ssidPatterns: ['eduroam'],
    bssidPrefixes: [], // Eduroam uses various vendor equipment
    dnsSuffixes: ['eduroam.org'],
    portalKeywords: ['eduroam', 'education roaming'],
    badgeLabel: 'Eduroam Network',
  },
];

/**
 * Get a network profile by its ID.
 */
export function getNetworkProfile(profileId: string): CollegeNetworkProfile | undefined {
  return COLLEGE_NETWORK_PROFILES.find((profile) => profile.id === profileId);
}

/**
 * Get all available network profiles.
 */
export function getAllNetworkProfiles(): CollegeNetworkProfile[] {
  return [...COLLEGE_NETWORK_PROFILES];
}
