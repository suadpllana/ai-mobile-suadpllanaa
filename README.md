# Books Club 📚

**Books Club** is a mobile application built with [Expo](https://expo.dev) and [React Native](https://reactnative.dev/) that allows users to discover books, track their reading progress, manage favorites, and explore authors. It leverages [Supabase](https://supabase.com/) for backend services including authentication and database management.

## 🚀 Features

- **Authentication**: Secure user sign-up, login, and password reset functionality.
- **Discover**: Browse and search for new books to read.
- **Reading Progress**: Track your reading sessions, view statistics, and set reading goals.
- **Favorites**: Save books to your personal favorites list.
- **Authors**: Explore author profiles and their works.
- **Recommendations**: Get personalized book recommendations.
- **Profile**: Manage your user profile and settings.

## 🛠 Tech Stack

- **Framework**: [Expo](https://docs.expo.dev/) (React Native)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Backend**: [Supabase](https://supabase.com/) (Auth, Database, Storage)
- **State Management/Data Fetching**: React Hooks
- **UI Components**: Custom components & React Native core components
- **Charts**: `react-native-chart-kit` for reading statistics

## 📂 Project Structure

```
MyProjectName/
├── app/                    # Expo Router pages and layouts
│   ├── (tabs)/             # Main tab navigation (Home, Discover, etc.)
│   ├── auth.tsx            # Authentication screen
│   ├── index.tsx           # Entry point
│   └── ...
├── assets/                 # Images and fonts
├── components/             # Reusable UI components
│   ├── reading-progress/   # Components specific to reading stats
│   ├── ui/                 # Generic UI elements
│   ├── ErrorBoundary.tsx   # Error handling component
│   └── LoadingSkeleton.tsx # Loading state components
├── constants/              # App constants (Colors, Theme)
├── hooks/                  # Custom React hooks
│   ├── useAuth.ts          # Authentication hook
│   ├── useBooks.ts         # Books data management
│   ├── useCategories.ts    # Categories management
│   ├── useReviews.ts       # Reviews management
│   └── useDebounce.ts      # Debounce hook
├── lib/                    # Helper functions and utilities
├── services/               # API service layer
│   ├── bookService.ts      # Book CRUD operations
│   ├── categoryService.ts  # Category operations
│   └── reviewService.ts    # Review operations
├── types/                  # TypeScript type definitions
│   └── index.ts            # Shared types
├── utils/                  # Utility functions
│   ├── constants.ts        # App-wide constants
│   ├── debounce.ts         # Debounce utilities
│   ├── logger.ts           # Centralized logging
│   └── validation.ts       # Input validation
├── scripts/                # Build and maintenance scripts
├── supabase.ts             # Supabase client configuration
├── .env.example            # Environment variables template
├── IMPROVEMENTS.md         # Documentation of improvements
└── MIGRATION_GUIDE.md      # Guide for using new features
```

## 🎯 Recent Improvements

This project has undergone significant refactoring to improve code quality, performance, and maintainability:

### ✅ Code Quality
- **Centralized Logging**: Replaced console statements with a proper logging service
- **Type Safety**: Comprehensive TypeScript types throughout the application
- **Service Layer**: API calls organized into service classes
- **Custom Hooks**: Reusable hooks for data fetching and state management

### ✅ Performance
- **React.memo**: List components optimized with memoization
- **useCallback/useMemo**: Expensive operations properly memoized
- **Debouncing**: Search inputs debounced to reduce API calls
- **Loading Skeletons**: Better perceived performance during data loading

### ✅ Error Handling
- **Error Boundaries**: Crash protection for UI components
- **Consistent Error Handling**: Unified approach across the app
- **Better Error Messages**: User-friendly error notifications

### ✅ Developer Experience
- **Constants Management**: All magic values centralized
- **Validation Utilities**: Reusable validation functions
- **JSDoc Documentation**: Comprehensive inline documentation
- **Migration Guides**: Step-by-step guides for adopting new patterns

See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for detailed information and [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for usage examples.

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo Go](https://expo.dev/client) app on your mobile device (iOS/Android)

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your actual credentials:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   HUGGING_FACE_API_TOKEN=your_hugging_face_token
   ```

**Note**: Never commit the `.env` file. It's already in `.gitignore`.

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd MyProjectName
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App

Start the development server:

```bash
npx expo start
```

- **Scan the QR code** with the Expo Go app (Android) or Camera app (iOS).
- Press `a` to open in Android Emulator.
- Press `i` to open in iOS Simulator.
- Press `w` to open in Web Browser.

## 📜 Scripts

- `npm start`: Starts the Expo development server.
- `npm run android`: Opens the app in the Android Emulator.
- `npm run ios`: Opens the app in the iOS Simulator.
- `npm run web`: Opens the app in the web browser.
- `npm run reset-project`: Resets the project to a blank state (use with caution).
- `npm run lint`: Runs the linter to check for code issues.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
