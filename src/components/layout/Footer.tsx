import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-white/10 py-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="text-gray-400 text-sm">
            © 2024 SafeVoice. Your voice, your safety, your anonymity.
          </div>
          <div className="flex items-center space-x-2 text-gray-400 text-sm">
            <span>Built with</span>
            <Heart className="w-4 h-4 text-red-500 fill-current" />
            <span>for students</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
