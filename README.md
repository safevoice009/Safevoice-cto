# SafeVoice v2.0

> India's first decentralized student platform for anonymous stories, crisis support, and safe communities.

## 🚀 Features

- **100% Anonymous** - No login, no tracking. Your identity stays completely private.
- **Anonymous Post Feed** - Share your story anonymously with emoji reactions and comments.
- **24/7 Crisis Support** - Instant access to verified helplines and mental health resources.
- **Community Spaces** - Connect with fellow students anonymously. Share experiences safely.
- **Safe Whistleblowing** - Expose institutional corruption. Your voice, their accountability.
- **Post Lifetime Control** - Set custom expiration times for your posts (1 hour to 30 days or never).
- **Image Support** - Attach images to your stories (up to 5MB).

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: TailwindCSS v3
- **Animations**: Framer Motion
- **Routing**: React Router v6
- **State Management**: Zustand
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Virtual Scrolling**: TanStack Virtual
- **Deployment**: GitHub Pages

## 📦 Installation

```bash
npm install
```

## 🏃 Development

```bash
npm run dev
```

This will start the development server at `http://localhost:5173`

## 🏗️ Build

```bash
npm run build
```

This will create an optimized production build in the `dist` folder.

## 🚢 Deployment

Deploy to GitHub Pages:

```bash
npm run deploy
```

## 📁 Project Structure

```
/src
  /components
    /layout       - Navbar, Footer, BottomNav
    /landing      - Hero, Features, Helplines, Memorial, CTASection
  /pages          - Landing, Feed (placeholder), Profile (placeholder)
  /lib            - store.ts (Zustand), constants.ts
  /styles         - tailwind.css, globals.css
```

## 🎨 Custom TailwindCSS Classes

- `.glass` - Glassmorphism effect with backdrop blur
- `.btn-primary` - Primary button styles (purple)
- `.btn-secondary` - Secondary button styles (red)
- `.nav-link` - Navigation link styles

## 🔑 Key Features

### Anonymous Student ID
Every visitor gets a unique `Student#XXXX` ID stored in localStorage, ensuring anonymity.

### Responsive Design
- Mobile: Single column layout with bottom navigation
- Tablet: 2-column grid
- Desktop: Full navbar with 2x2 feature grid

### Smooth Animations
All animations powered by Framer Motion with proper TypeScript typing.

## 📝 License

This project is licensed under the terms specified in the LICENSE file.

## 💙 Built with Love for Students

SafeVoice empowers every student to speak out fearlessly and build safer campuses across India.
