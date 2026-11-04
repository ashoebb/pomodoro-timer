# Pomodoro Timer

A modern, accessible, and fully-featured Pomodoro Timer web application built with vanilla JavaScript (ES6 modules). No frameworks, no build step - just open `index.html` in your browser!

![Pomodoro Timer Screenshot](https://img.shields.io/badge/Status-Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Vanilla JS](https://img.shields.io/badge/Vanilla-JS-yellow)

## Features

### Core Functionality
- ✅ **Start / Pause / Resume / Reset** timer controls
- ✅ **Configurable intervals**: Work (default 25min), Short Break (5min), Long Break (15min)
- ✅ **Automatic session switching**: Work → Short Break → Work → Long Break (after 4 sessions)
- ✅ **Session counter**: Tracks completed work sessions (e.g., "2/4")
- ✅ **Sound notifications**: Multiple built-in sounds (Bell, Chime, Ding, Alarm)
- ✅ **Browser notifications**: Optional desktop notifications when sessions complete

### User Experience
- ✅ **Beautiful circular progress indicator** with smooth animations
- ✅ **Responsive design**: Works perfectly on mobile, tablet, and desktop
- ✅ **Dark mode support**: Automatically adapts to system preference
- ✅ **Keyboard shortcuts**: Space (Start/Pause), R (Reset), Arrow keys (Adjust time)
- ✅ **Full accessibility**: ARIA labels, focus management, screen reader support
- ✅ **High contrast mode support**
- ✅ **Reduced motion support**

### Data Persistence
- ✅ **Settings saved to localStorage**: Your preferences persist between sessions
- ✅ **Statistics tracking**: Total sessions, focus time, daily streak
- ✅ **Export/Import data**: Backup and restore your progress

### Developer Experience
- ✅ **Modular ES6 architecture**: Clean separation of concerns
- ✅ **Zero dependencies**: No npm, no build tools required
- ✅ **Well documented**: JSDoc comments throughout
- ✅ **PWA ready**: Manifest file for "Add to Home Screen"

## Quick Start

### Option 1: Direct Download
1. Download or clone this repository
2. Open `index.html` in any modern browser
3. Start focusing!

### Option 2: GitHub Pages (Free Hosting)
1. Fork this repository
2. Go to Settings → Pages
3. Select "Deploy from branch" → `main` → `/ (root)`
4. Your timer will be live at `https://yourusername.github.io/pomodoro-timer/`

### Option 3: Local Development Server
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using PHP
php -S localhost:8000
```
Then open `http://localhost:8000`

## Project Structure

```
pomodoro-timer/
├── index.html          # Main HTML structure
├── manifest.json       # PWA manifest
├── css/
│   └── styles.css      # All styles (responsive, accessible, themed)
├── js/
│   ├── app.js          # Main application controller
│   ├── timer.js        # Timer core logic & state management
│   ├── audio.js        # Sound notifications (Web Audio API)
│   └── storage.js      # Settings & stats persistence
└── assets/
    └── sounds/         # (Optional) Custom sound files
```

## Architecture

### Modules

| Module | Responsibility |
|--------|----------------|
| `timer.js` | Core timer logic, session management, state machine |
| `audio.js` | Sound synthesis via Web Audio API + HTML5 fallback |
| `storage.js` | localStorage persistence for settings & statistics |
| `app.js` | UI binding, event handling, module coordination |

### Timer State Machine

```
IDLE → RUNNING → PAUSED → RUNNING
  ↑      ↓           ↑
  └──── COMPLETED ←──┘
         ↓
        IDLE (or auto-start next)
```

### Session Flow

```
Work (25m) → Short Break (5m) → Work (25m) → Short Break (5m)
    ↓                                              ↓
Long Break (15m) ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
    ↓
Work (25m) → ... (repeats every 4 work sessions)
```

## Configuration

All settings are configurable via the UI and persisted automatically:

| Setting | Default | Range |
|---------|---------|-------|
| Work Duration | 25 min | 1-60 min |
| Short Break | 5 min | 1-30 min |
| Long Break | 15 min | 5-60 min |
| Sessions until Long Break | 4 | 2-10 |
| Auto-start Breaks | On | - |
| Auto-start Work | Off | - |
| Sound Enabled | On | - |
| Browser Notifications | Off | - |
| Notification Sound | Bell | Bell/Chime/Ding/Alarm |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Start / Pause / Resume |
| `R` | Reset timer |
| `←` / `→` | Decrease / Increase current session time (1 min) |
| `S` | Focus settings panel |

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 66+ |
| Firefox | 60+ |
| Safari | 14.1+ |
| Edge | 79+ |
| Mobile Safari | 14.5+ |
| Chrome Android | 66+ |

**Requires**: ES6 Modules, Web Audio API, localStorage, Notification API (optional)

## Accessibility

This application follows WCAG 2.1 AA guidelines:

- **Semantic HTML**: Proper heading hierarchy, landmarks, roles
- **ARIA**: Live regions for timer updates, labels for all controls
- **Focus Management**: Visible focus indicators, logical tab order
- **Color Contrast**: Meets 4.5:1 ratio in both light/dark modes
- **Keyboard Navigation**: All features accessible without mouse
- **Screen Readers**: Announces session changes, time updates
- **Reduced Motion**: Respects `prefers-reduced-motion`
- **High Contrast**: Enhanced borders in forced-colors mode

## Customization

### Adding Custom Sounds

1. Add `.mp3` files to `assets/sounds/`
2. Update `audio.js` soundRecipes or add `<audio>` elements in `index.html`
3. Add option to `<select id="notificationSound">`

### Theming

Modify CSS custom properties in `styles.css`:

```css
:root {
    --color-primary: #your-brand-color;
    --color-background: #your-bg-color;
    /* ... */
}
```

### Adding Features

The modular structure makes it easy to add:
- Task lists / todo integration
- Pomodoro history / charts
- Sync across devices (with backend)
- Custom themes
- Sound packs

## Scripts for Package.json (Optional)

If you want to add a `package.json` for development tools:

```json
{
  "scripts": {
    "start": "npx serve .",
    "lint": "eslint js/",
    "format": "prettier --write \"**/*.{js,css,html,json}\"",
    "test": "echo \"No tests yet\""
  },
  "devDependencies": {
    "serve": "^14.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

## Deployment

### Netlify
1. Drag & drop the folder to Netlify Drop
2. Or connect GitHub repo for auto-deploy

### Vercel
```bash
npx vercel deploy
```

### GitHub Pages
See "Quick Start → Option 2" above

### Docker (for containerized deployment)
```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - feel free to use for personal or commercial projects!

## Acknowledgments

- Inspired by [Pomofocus](https://pomofocus.io/) and [time.fyi](https://time.fyi/)
- Pomodoro Technique® by Francesco Cirillo
- Icons from system emoji fonts
- Font: [Inter](https://rsms.me/inter/) via Google Fonts

---

**Built with ❤️ for productivity enthusiasts everywhere**

*Star this repo if you find it useful!*