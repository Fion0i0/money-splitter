# Money Splitter

A trip expense splitting app built with React, Firebase, and Google Gemini AI. Track shared expenses, calculate who owes whom, and settle debts easily.

## Features

- **Trip Management** - Create and manage multiple trips with participants
- **Expense Tracking** - Add expenses with multi-currency support (TWD, HKD, JPY, USD, EUR, GBP, CNY, KRW, THB)
- **AI-Powered Input** - Use Gemini AI to parse expenses from natural language
- **Live Exchange Rates** - Fetch real-time currency rates via AI
- **Smart Settlement** - Optimized debt calculation to minimize transactions
- **Payment Methods** - Store payment details (Line Pay, iPASS, FPS, PayMe, bank accounts)
- **VIP List** - Save frequently used participants
- **Real-time Sync** - Firebase backend for multi-device sync

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore)
- **AI**: Google Gemini AI
- **Build**: Vite

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables in `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

## Build for Production

```bash
npm run build
npm run preview
```

## Deploy to iOS (Optional)

This app can be packaged for the iOS App Store using Capacitor:

1. Install Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/ios
   npx cap init
   ```

2. Build and sync:
   ```bash
   npm run build
   npx cap add ios
   npx cap sync
   ```

3. Open in Xcode:
   ```bash
   npx cap open ios
   ```

**Requirements:** Apple Developer Account ($99/year), Mac with Xcode
