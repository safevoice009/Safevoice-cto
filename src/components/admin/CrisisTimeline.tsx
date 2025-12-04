import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Clock, CheckCircle, XCircle, User } from 'lucide-react';
import { getCrisisQueueService, type CrisisRequest } from '../../lib/crisisQueue';
import { formatTimeAgo } from '../../lib/utils';

export default function CrisisTimeline() {
  const [requests, setRequests] = useState<CrisisRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'assigned' | 'resolved'>('all');

  useEffect(() => {
    const crisisService = getCrisisQueueService();
    
    const initialRequests = crisisService.getSnapshot();
    setRequests(initialRequests.sort((a, b) => b.timestamp - a.timestamp));

    const unsubscribe = crisisService.subscribe('crisis-timeline', () => {
      const updatedRequests = crisisService.getSnapshot();
      setRequests(updatedRequests.sort((a, b) => b.timestamp - a.timestamp));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(r => r.status === filter);

  const getStatusIcon = (status: CrisisRequest['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'assigned':
        return <Clock className="w-5 h-5 text-orange-400" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'expired':
        return <XCircle className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: CrisisRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'assigned':
        return 'border-orange-500/30 bg-orange-500/10';
      case 'resolved':
        return 'border-green-500/30 bg-green-500/10';
      case 'expired':
        return 'border-gray-500/30 bg-gray-500/10';
      default:
        return 'border-white/10 bg-surface/50';
    }
  };

  const getSeverityColor = (level: CrisisRequest['crisisLevel']) => {
    return level === 'critical' 
      ? 'bg-red-500/20 text-red-400' 
      : 'bg-yellow-500/20 text-yellow-400';
  };

  const getTimeRemaining = (expiresAt: number) => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return 'Expired';
    
    const minutes = Math.floor(remaining / 1000 / 60);
    const seconds = Math.floor((remaining / 1000) % 60);
    
    if (minutes < 1) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="glass p-4 rounded-lg">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {[
            { value: 'all', label: 'All Requests' },
            { value: 'pending', label: 'Pending' },
            { value: 'assigned', label: 'Assigned' },
            { value: 'resolved', label: 'Resolved' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as typeof filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filter === tab.value
                  ? 'bg-primary text-black'
                  : 'bg-surface text-gray-300 hover:bg-surface/80'
              }`}
            >
              {tab.label}
              {tab.value !== 'all' && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-black/20 text-xs">
                  {requests.filter(r => r.status === tab.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredRequests.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass p-8 rounded-lg text-center"
            >
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
              <p className="text-gray-400">No crisis requests found</p>
              <p className="text-sm text-gray-500 mt-2">
                {filter !== 'all' ? `Try selecting a different filter` : `Crisis requests will appear here`}
              </p>
            </motion.div>
          ) : (
            filteredRequests.map((request, index) => (
              <motion.div
                key={request.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`glass rounded-lg p-5 border ${getStatusColor(request.status)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      {getStatusIcon(request.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSeverityColor(request.crisisLevel)}`}>
                          {request.crisisLevel.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-400">
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-1">
                        Request ID: <span className="font-mono text-white">{request.id.slice(0, 8)}...</span>
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <User className="w-3 h-3" />
                        <span>Student: {request.studentId}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">
                      {formatTimeAgo(request.timestamp)}
                    </p>
                    {request.status !== 'resolved' && request.status !== 'expired' && (
                      <p className="text-xs text-orange-400">
                        {getTimeRemaining(request.expiresAt)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Additional Details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {request.postId && (
                    <div className="bg-black/30 rounded p-2">
                      <p className="text-gray-400">Post ID</p>
                      <p className="text-white font-mono">{request.postId.slice(0, 12)}...</p>
                    </div>
                  )}
                  {request.volunteerId && (
                    <div className="bg-black/30 rounded p-2">
                      <p className="text-gray-400">Volunteer</p>
                      <p className="text-white">{request.volunteerId}</p>
                    </div>
                  )}
                  <div className="bg-black/30 rounded p-2">
                    <p className="text-gray-400">TTL</p>
                    <p className="text-white">{Math.round(request.ttl / 1000 / 60)} minutes</p>
                  </div>
                  {request.metadata?.resolvedAt && typeof request.metadata.resolvedAt === 'number' ? (
                    <div className="bg-black/30 rounded p-2">
                      <p className="text-gray-400">Resolved</p>
                      <p className="text-white">{formatTimeAgo(request.metadata.resolvedAt)}</p>
                    </div>
                  ) : null}
                </div>

                {/* Metadata */}
                {request.metadata && Object.keys(request.metadata).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-400 hover:text-gray-300">
                        View Metadata
                      </summary>
                      <pre className="mt-2 p-2 bg-black/30 rounded overflow-x-auto text-gray-300">
                        {JSON.stringify(request.metadata, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
