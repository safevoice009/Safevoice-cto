import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, User, Phone, Mail, Edit2, Save } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function ProfileCrisisCard() {
  const trustedContacts = useStore((state) => state.trustedContacts);
  const setTrustedContact = useStore((state) => state.setTrustedContact);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [error, setError] = useState('');

  const primaryContact = trustedContacts && trustedContacts.length > 0 ? trustedContacts[0] : null;

  const handleEdit = () => {
    setFormData({
      name: primaryContact?.name || '',
      phone: primaryContact?.phone || '',
      email: primaryContact?.email || '',
    });
    setError('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!formData.email.trim() && !formData.phone.trim()) {
      setError('Either email or phone is required');
      return;
    }

    setTrustedContact({
      name: formData.name.trim(),
      phone: formData.phone.trim() || undefined,
      email: formData.email.trim() || undefined,
    });
    setIsEditing(false);
    setError('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass p-6 space-y-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Shield className="w-7 h-7 text-primary" />
          <div>
            <h2 className="text-2xl font-bold text-white">Trusted Contact</h2>
            <p className="text-sm text-gray-400">Primary contact for crisis alerts</p>
          </div>
        </div>
        {!isEditing && primaryContact && (
          <button
            onClick={handleEdit}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            aria-label="Edit contact"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4 bg-surface/50 p-4 rounded-lg border border-white/10">
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary"
                  placeholder="Contact Name"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary"
                  placeholder="Phone Number"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-background/50 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary"
                  placeholder="Email Address"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 bg-primary hover:bg-primary/80 text-white text-sm rounded-lg transition-colors flex items-center space-x-1"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </div>
      ) : primaryContact ? (
        <div className="p-4 bg-surface/50 rounded-lg border border-white/10 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-lg font-bold text-primary">
                {primaryContact.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h4 className="font-semibold text-white">{primaryContact.name}</h4>
              <p className="text-xs text-green-400 flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                Verified Contact
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 pt-2 border-t border-white/5">
            {primaryContact.phone && (
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{primaryContact.phone}</span>
              </div>
            )}
            {primaryContact.email && (
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{primaryContact.email}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-surface/30 rounded-lg border border-dashed border-white/20">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm mb-4">No trusted contact set</p>
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-surface hover:bg-surface/80 text-white text-sm rounded-lg transition-colors"
          >
            Add Contact
          </button>
        </div>
      )}
    </motion.div>
  );
}
