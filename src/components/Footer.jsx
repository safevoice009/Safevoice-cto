const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-semibold text-white mb-2">SafeVoice</h3>
            <p className="text-gray-400">Empowering anonymous expression, safely and securely.</p>
          </div>
          <nav className="flex flex-wrap justify-center md:justify-end gap-6 text-sm uppercase tracking-wide">
            <a href="#" className="hover:text-white transition">About</a>
            <a href="#" className="hover:text-white transition">Features</a>
            <a href="#" className="hover:text-white transition">FAQs</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </nav>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500">
          &copy; {currentYear} SafeVoice. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
