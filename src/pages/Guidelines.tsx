import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Heart,
  Lock,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Flag,
  Eye,
} from 'lucide-react';

export default function GuidelinesPage() {
  useEffect(() => {
    document.title = 'Community Guidelines | SafeVoice';
  }, []);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <header className="text-center space-y-4">
          <Shield className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-4xl font-bold text-white">Community Guidelines</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            SafeVoice is a place for honest, anonymous expression. These guidelines help keep our
            community supportive and safe.
          </p>
        </header>

        <section className="glass p-8 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3">
            <Heart className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold text-white">Our Values</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-white">Anonymity</h3>
              </div>
              <p className="text-gray-300 text-sm">Your identity is protected</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-white">Support</h3>
              </div>
              <p className="text-gray-300 text-sm">We're here for each other</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-white">Freedom</h3>
              </div>
              <p className="text-gray-300 text-sm">Express yourself honestly</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-white">Safety</h3>
              </div>
              <p className="text-gray-300 text-sm">Report harmful content</p>
            </div>
          </div>
        </section>

        <section className="glass p-8 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-semibold text-white">What's Allowed</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Sharing struggles with mental health, anxiety, and depression
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Discussing academic pressure, stress, and examination anxiety
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Seeking advice and support from the community anonymously
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Whistleblowing corruption, ragging, or institutional issues
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Using strong language to express emotions in appropriate context
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Sharing controversial opinions expressed respectfully
              </span>
            </li>
          </ul>
        </section>

        <section className="glass p-8 rounded-2xl border border-red-500/30 space-y-6">
          <div className="flex items-center space-x-3">
            <XCircle className="w-6 h-6 text-red-400" />
            <h2 className="text-2xl font-semibold text-white">What's Not Allowed</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Sharing personal information (yours or others') - phone, email, address, ID
                numbers
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Targeted harassment, bullying, or attacks against specific individuals
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Spam, repetitive content, or excessive promotional links
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Graphic violent or sexual content without appropriate warnings
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">Impersonation or catfishing</span>
            </li>
            <li className="flex items-start space-x-3">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Encouraging or glorifying self-harm (support posts are okay)
              </span>
            </li>
          </ul>
        </section>

        <section className="glass p-8 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold text-white">Getting Help</h2>
          </div>
          <p className="text-gray-300">
            If you're in crisis or need support, we have 24/7 helplines ready to help. You're not
            alone.
          </p>
          <Link
            to="/helplines"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-glow transition-all"
          >
            <Heart className="w-5 h-5" />
            <span>View Crisis Helplines</span>
          </Link>
        </section>

        <section className="glass p-8 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3">
            <Flag className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold text-white">Reporting</h2>
          </div>
          <ul className="space-y-3 text-gray-300">
            <li>• See something concerning? Report it anonymously.</li>
            <li>• Reports are reviewed as soon as possible</li>
            <li>• False reports may result in restrictions</li>
            <li>• Crisis reports get priority response</li>
          </ul>
        </section>

        <section className="glass p-8 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold text-white">Appeals</h2>
          </div>
          <p className="text-gray-300">
            Think your post was wrongly removed? We're working on an appeal process to help you
            contest moderation decisions fairly.
          </p>
          <p className="text-sm text-gray-400">
            (Appeal form coming soon - currently under development)
          </p>
        </section>

        <section className="glass p-8 rounded-2xl border border-white/10 space-y-6">
          <div className="flex items-center space-x-3">
            <Eye className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-semibold text-white">Transparency</h2>
          </div>
          <p className="text-gray-300">
            We believe in transparent moderation. All moderation actions are logged (anonymously)
            to ensure accountability.
          </p>
          <p className="text-sm text-gray-400">
            (Public moderation log coming soon - currently under development)
          </p>
        </section>

        <footer className="text-center text-gray-400 text-sm space-y-2">
          <p>These guidelines are here to protect you and the community.</p>
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </footer>
      </div>
    </div>
  );
}
