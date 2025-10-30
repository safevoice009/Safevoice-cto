import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../lib/store';
import { User, Bookmark, MessageSquare, FileText } from 'lucide-react';
import PostCard from '../components/feed/PostCard';
import WalletSection from '../components/wallet/WalletSection';

type ProfileTab = 'overview' | 'wallet';

export default function Profile() {
  const { studentId, posts, bookmarkedPosts, initializeStore } = useStore();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const myPosts = posts.filter((post) => post.studentId === studentId);
  const savedPosts = posts.filter((post) => bookmarkedPosts.includes(post.id));
  const totalComments = posts.reduce((sum, post) => sum + post.commentCount, 0);

  return (
    <motion.section
      className="min-h-screen px-4 py-8 max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-6">
        <div className="glass p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-white">{studentId}</h1>
            <p className="text-gray-400 mt-2">Your anonymous identity</p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <FileText className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold text-white">{myPosts.length}</p>
              </div>
              <p className="text-sm text-gray-400">Posts</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold text-white">{totalComments}</p>
              </div>
              <p className="text-sm text-gray-400">Comments</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Bookmark className="w-5 h-5 text-primary" />
                <p className="text-2xl font-bold text-white">{savedPosts.length}</p>
              </div>
              <p className="text-sm text-gray-400">Saved</p>
            </div>
          </div>
        </div>

        <div className="glass p-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-surface/50 text-gray-300 hover:text-white'
            }`}
            type="button"
          >
            Profile Overview
          </button>
          <button
            onClick={() => setActiveTab('wallet')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'wallet'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                : 'bg-surface/50 text-gray-300 hover:text-white'
            }`}
            type="button"
          >
            💰 Wallet
          </button>
        </div>

        {activeTab === 'overview' ? (
          <div className="glass p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">Bookmarked Posts</h2>
            {savedPosts.length === 0 ? (
              <div className="text-center py-10 text-gray-400 space-y-2">
                <Bookmark className="w-8 h-8 mx-auto" />
                <p className="text-sm">No bookmarked posts yet</p>
                <p className="text-xs">Save posts you find helpful or inspiring</p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {savedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : (
          <WalletSection />
        )}
      </div>
    </motion.section>
  );
}
