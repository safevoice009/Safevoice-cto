export const helplines = [
  { name: 'Aasra Suicide Prevention Helpline', phone: '91-9820466726' },
  { name: 'Kiran Mental Health Helpline', phone: '1800-599-0019' },
  { name: 'Snehi 24x7 Helpline', phone: '91-9582208181' },
  { name: 'iCall Psychosocial Helpline', phone: '9152987821' },
];

export const colleges = [
  'IIT Bombay',
  'IIT Delhi',
  'IIT Madras',
  'IISc Bangalore',
  'NIT Trichy',
  'AIIMS Delhi',
  'BITS Pilani',
  'Delhi University',
];

// P2P Configuration
export const P2P_CONFIG = {
  MAX_PEERS: parseInt(import.meta.env.VITE_P2P_MAX_PEERS || '5', 10),
  MIN_PEERS: parseInt(import.meta.env.VITE_P2P_MIN_PEERS || '3', 10),
  HEARTBEAT_INTERVAL_MS: parseInt(import.meta.env.VITE_P2P_HEARTBEAT_INTERVAL_MS || '30000', 10),
  ENABLED: import.meta.env.VITE_P2P_ENABLED !== 'false', // Default enabled
};

export const P2P_TOPICS = [
  'mental-health',
  'academics',
  'general',
  'crisis',
  'memorial',
];

// Bootstrap nodes for P2P discovery (configurable via env)
export const P2P_BOOTSTRAP_HOSTS = (import.meta.env.VITE_P2P_BOOTSTRAP_HOSTS || '')
  .split(',')
  .filter(Boolean)
  .map((host: string, index: number) => ({
    id: `bootstrap-${index + 1}`,
    url: host.trim(),
    region: 'custom',
    priority: 1,
  }));
