import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DiagramStep {
  label: string;
  description: string;
  icon: string;
}

const steps: DiagramStep[] = [
  {
    label: 'You',
    description: 'Your device - where all data starts',
    icon: '👤',
  },
  {
    label: 'Encryption',
    description: 'Data encrypted locally (AES-256)',
    icon: '🔐',
  },
  {
    label: 'Local Storage',
    description: 'Encrypted storage on your device',
    icon: '💾',
  },
  {
    label: 'No Server Upload',
    description: 'Data stays on your device by default',
    icon: '🚫',
  },
  {
    label: 'Optional IPFS',
    description: 'Decentralized backup (anonymous)',
    icon: '🌐',
  },
];

export default function DataFlowDiagram() {
  const [expanded, setExpanded] = useState(false);
  const [focusedStep, setFocusedStep] = useState<number | null>(null);

  const handleKeyDown = (
    e: React.KeyboardEvent,
    stepIndex: number
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFocusedStep(focusedStep === stepIndex ? null : stepIndex);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass p-8 rounded-2xl border border-white/10"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white">How Your Data Flows</h3>
          <p className="text-gray-400 mt-2">
            Your data journey from creation to storage
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label={expanded ? 'Collapse diagram' : 'Expand diagram'}
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronUp className="w-6 h-6 text-primary" />
          ) : (
            <ChevronDown className="w-6 h-6 text-primary" />
          )}
        </button>
      </div>

      {/* Desktop SVG Diagram */}
      <div className="hidden md:block overflow-x-auto mb-8">
        <svg
          viewBox="0 0 900 300"
          className="w-full min-w-max"
          aria-label="Data flow diagram showing secure data storage process"
          role="img"
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
            </marker>
          </defs>

          {/* Step 1: User */}
          <rect
            x="20"
            y="80"
            width="100"
            height="100"
            rx="10"
            fill="rgba(59, 130, 246, 0.2)"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
          />
          <text
            x="70"
            y="120"
            textAnchor="middle"
            fontSize="40"
            role="img"
            aria-label="You"
          >
            👤
          </text>
          <text
            x="70"
            y="150"
            textAnchor="middle"
            fontSize="14"
            fill="white"
            fontWeight="bold"
          >
            You
          </text>
          <text
            x="70"
            y="170"
            textAnchor="middle"
            fontSize="12"
            fill="#a0aec0"
          >
            Your Device
          </text>

          {/* Arrow 1 */}
          <line
            x1="120"
            y1="130"
            x2="160"
            y2="130"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />

          {/* Step 2: Encryption */}
          <rect
            x="160"
            y="80"
            width="100"
            height="100"
            rx="10"
            fill="rgba(34, 197, 94, 0.2)"
            stroke="rgb(34, 197, 94)"
            strokeWidth="2"
          />
          <text
            x="210"
            y="120"
            textAnchor="middle"
            fontSize="40"
            role="img"
            aria-label="Encryption"
          >
            🔐
          </text>
          <text
            x="210"
            y="150"
            textAnchor="middle"
            fontSize="14"
            fill="white"
            fontWeight="bold"
          >
            Encryption
          </text>
          <text
            x="210"
            y="170"
            textAnchor="middle"
            fontSize="12"
            fill="#a0aec0"
          >
            AES-256
          </text>

          {/* Arrow 2 */}
          <line
            x1="260"
            y1="130"
            x2="300"
            y2="130"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />

          {/* Step 3: Local Storage */}
          <rect
            x="300"
            y="80"
            width="100"
            height="100"
            rx="10"
            fill="rgba(168, 85, 247, 0.2)"
            stroke="rgb(168, 85, 247)"
            strokeWidth="2"
          />
          <text
            x="350"
            y="120"
            textAnchor="middle"
            fontSize="40"
            role="img"
            aria-label="Local Storage"
          >
            💾
          </text>
          <text
            x="350"
            y="150"
            textAnchor="middle"
            fontSize="14"
            fill="white"
            fontWeight="bold"
          >
            Stored Locally
          </text>
          <text
            x="350"
            y="170"
            textAnchor="middle"
            fontSize="12"
            fill="#a0aec0"
          >
            Browser Storage
          </text>

          {/* Arrow 3 - to "No Server" */}
          <line
            x1="400"
            y1="130"
            x2="440"
            y2="130"
            stroke="rgb(239, 68, 68)"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            strokeDasharray="5,5"
          />

          {/* Step 4: No Server Upload */}
          <rect
            x="440"
            y="80"
            width="100"
            height="100"
            rx="10"
            fill="rgba(239, 68, 68, 0.2)"
            stroke="rgb(239, 68, 68)"
            strokeWidth="2"
          />
          <text
            x="490"
            y="120"
            textAnchor="middle"
            fontSize="40"
            role="img"
            aria-label="Blocked"
          >
            🚫
          </text>
          <text
            x="490"
            y="150"
            textAnchor="middle"
            fontSize="14"
            fill="white"
            fontWeight="bold"
          >
            No Server
          </text>
          <text
            x="490"
            y="170"
            textAnchor="middle"
            fontSize="12"
            fill="#a0aec0"
          >
            Default: Blocked
          </text>

          {/* Arrow 4 - Optional to IPFS */}
          <line
            x1="540"
            y1="130"
            x2="620"
            y2="130"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            strokeDasharray="5,5"
          />
          <text
            x="580"
            y="110"
            textAnchor="middle"
            fontSize="11"
            fill="#60a5fa"
            fontStyle="italic"
          >
            Optional
          </text>

          {/* Step 5: IPFS */}
          <rect
            x="620"
            y="80"
            width="100"
            height="100"
            rx="10"
            fill="rgba(59, 130, 246, 0.2)"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          <text
            x="670"
            y="120"
            textAnchor="middle"
            fontSize="40"
            role="img"
            aria-label="IPFS"
          >
            🌐
          </text>
          <text
            x="670"
            y="150"
            textAnchor="middle"
            fontSize="14"
            fill="white"
            fontWeight="bold"
          >
            IPFS Backup
          </text>
          <text
            x="670"
            y="170"
            textAnchor="middle"
            fontSize="12"
            fill="#a0aec0"
          >
            Decentralized
          </text>

          {/* Legend */}
          <line
            x1="20"
            y1="230"
            x2="70"
            y2="230"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
          />
          <text x="80" y="235" fontSize="12" fill="#a0aec0">
            Primary Flow
          </text>

          <line
            x1="300"
            y1="230"
            x2="350"
            y2="230"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          <text x="360" y="235" fontSize="12" fill="#a0aec0">
            Optional Path
          </text>
        </svg>
      </div>

      {/* Mobile Vertical Flow */}
      <div className="md:hidden space-y-4 mb-8">
        {steps.map((step, index) => (
          <motion.div key={index} layout>
            <button
              onClick={() =>
                setFocusedStep(focusedStep === index ? null : index)
              }
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`w-full p-4 rounded-lg border transition-all text-left ${
                focusedStep === index
                  ? 'bg-primary/20 border-primary'
                  : 'bg-white/5 border-white/10 hover:border-primary/50'
              }`}
              aria-expanded={focusedStep === index}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{step.icon}</span>
                  <h4 className="font-semibold text-white">{step.label}</h4>
                </div>
                {focusedStep === index ? (
                  <ChevronUp className="w-5 h-5 text-primary" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
              {focusedStep === index && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-sm text-gray-300 ml-11"
                >
                  {step.description}
                </motion.p>
              )}
            </button>

            {index < steps.length - 1 && (
              <div className="flex justify-center py-2">
                <div className="w-1 h-4 bg-gradient-to-b from-primary to-transparent" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Detailed Info */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-8 pt-8 border-t border-white/10 space-y-4"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-semibold text-white mb-2 flex items-center space-x-2">
                <span>✅</span>
                <span>By Default</span>
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Data encrypted locally</li>
                <li>• Stored on your device</li>
                <li>• No transmission anywhere</li>
                <li>• Maximum privacy</li>
              </ul>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-semibold text-white mb-2 flex items-center space-x-2">
                <span>🔄</span>
                <span>When You Choose</span>
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Backup to IPFS network</li>
                <li>• Decentralized storage</li>
                <li>• No identity link</li>
                <li>• Still anonymous</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
