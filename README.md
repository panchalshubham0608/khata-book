# 📘 Khata Book – Personal Expense Tracker (PWA)

A clean, fast, and modern expense tracking web app inspired by traditional “खाता-बही” practices.
Built with React + Vite, Firebase Firestore, and react-i18next for bilingual support (Hindi/English).

The app works as a PWA, supports offline caching, and can be installed on mobile or desktop.

# 🚀 Features
## 🧾 Expense Tracking
- Add, edit, and delete expenses
- Categorize income/expense using positive/negative amounts
- Soft-deletion with auto cleanup after 30 days
- Voice input parsing (e.g.,
"दूध के ₹200" → title: "दूध", amount: 200)

## 📊 Reports
- Create multiple reports
- Track total spent and remaining budget
- Top-up budgets
- Share reports with other users (email based)
- Manage access (add/remove shared users)

## 🧠 Voice Input Parsing
Smart parsing for natural Hindi input:
Examples handled:
- दूध के ₹200
- सब्जियों के 93 रुपए
- पेट्रोल के 300
- 300 petrol
- petrol 300

Extracts both title + amount automatically.

## 🗑️ Soft Deletion System
- Deleted reports & expenses are only marked deleted  true
- Automatically purged after 30 days
- Shows a chip like: “मिट जाएगा X दिनों में” (auto-expiry countdown)

## 👤 Authentication
- Login with Google
- Session stays persistent across reloads (using Firestore Auth persistence)

## 💾 Persistence
- Firebase Firestore
- Query filters exclude soft-deleted reports
- LocalStorage for UI preferences (e.g., “Show deleted reports”)

# 🔧 Setup Instructions
1. Clone the repo
```bash
git clone https://github.com/<your-username>/khata-book-webapp.git
cd khata-book-webapp
```

2. Install dependencies
```bash
npm install
```

3. Set up Firebase environment - create .env:
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

4. Start the dev server
```bash
npm run dev
```

5. Build for production
```bash
npm run build
```

# 📦 Deployment
The app can be deployed on:
- GitHub Pages (supports PWA install prompts)
- Vercel
- Firebase Hosting
- Netlify

When deploying on GitHub pages, ensure the Vite config uses:
```js
export default defineConfig({
  base: "/khata-book/"
});
```

# 🤝 Contributing
- Fork the repo
- Create a feature branch
- Commit changes
- Open a pull request

# 📄 License
MIT License.
