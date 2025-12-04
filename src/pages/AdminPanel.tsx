import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  AlertCircle, 
  FileText,
  Lock 
} from 'lucide-react';
import { useStore } from '../lib/store';
import ModeratorPanel from '../components/feed/ModeratorPanel';
import CommunityModerationPanel from '../components/community/CommunityModerationPanel';
import MemberTable from '../components/admin/MemberTable';
import CrisisAnalytics from '../components/admin/CrisisAnalytics';
import CrisisTimeline from '../components/admin/CrisisTimeline';
import ReportingExport from '../components/admin/ReportingExport';

type AdminTab = 'moderation' | 'members' | 'crisis' | 'reporting';

export default function AdminPanel() {
  const isModerator = useStore((state) => state.isModerator);
  const [activeTab, setActiveTab] = useState<AdminTab>('moderation');

  if (!isModerator) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-lg max-w-md w-full mx-4 text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-500/20 rounded-full">
              <Lock className="w-12 h-12 text-red-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-4">
            You need moderator privileges to access the Admin Panel.
          </p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact a system administrator.
          </p>
        </motion.div>
      </div>
    );
  }

  const tabs = [
    { id: 'moderation' as const, label: 'Moderation', icon: Shield },
    { id: 'members' as const, label: 'Members', icon: Users },
    { id: 'crisis' as const, label: 'Crisis Ops', icon: AlertCircle },
    { id: 'reporting' as const, label: 'Reporting', icon: FileText },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center space-x-3">
                <Shield className="w-8 h-8 text-primary" />
                <span>Admin Panel</span>
              </h1>
              <p className="text-gray-400">
                Manage moderation, users, crisis response, and generate reports
              </p>
            </div>
            <div className="glass px-4 py-2 rounded-lg">
              <p className="text-sm text-gray-400">Moderator</p>
              <p className="text-lg font-semibold text-primary">Access Granted</p>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass p-2 rounded-lg mb-8"
        >
          <div className="flex space-x-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary text-black'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'moderation' && (
            <div className="space-y-6">
              <div className="glass p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Content Moderation</h2>
                <p className="text-gray-400 mb-6">
                  Review and manage reported content, posts, and comments
                </p>
              </div>
              <ModeratorPanel />
              <CommunityModerationPanel />
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="glass p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Member Management</h2>
                <p className="text-gray-400 mb-2">
                  Manage community members, issue warnings, and handle bans
                </p>
                <p className="text-sm text-primary">
                  ✨ All actions reward +100 VOICE tokens
                </p>
              </div>
              <MemberTable />
            </div>
          )}

          {activeTab === 'crisis' && (
            <div className="space-y-6">
              <div className="glass p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Crisis Response Operations</h2>
                <p className="text-gray-400 mb-2">
                  Monitor crisis requests, track response times, and analyze patterns
                </p>
              </div>
              
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Analytics</h3>
                  <CrisisAnalytics />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
                  <CrisisTimeline />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reporting' && (
            <div className="space-y-6">
              <div className="glass p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Reporting & Export</h2>
                <p className="text-gray-400">
                  Export moderation data, reports, and member information for analysis
                </p>
              </div>
              <ReportingExport />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
