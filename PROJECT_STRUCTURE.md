# Domino Web App - Project Structure

## Technology Stack

- **Framework**: React 19.2.0 with TypeScript
- **Build Tool**: Vite 7.2.4
- **Styling**: Tailwind CSS 4.1.17
- **Storage**: localforage 1.10.0 (IndexedDB wrapper)
- **ML/AI**: TensorFlow.js 4.22.0 with COCO-SSD 2.2.3

## TypeScript Configuration

- Strict mode enabled
- Target: ES2022
- Module: ESNext
- JSX: react-jsx
- Additional strict checks:
  - noUnusedLocals
  - noUnusedParameters
  - noFallthroughCasesInSwitch
  - noUncheckedSideEffectImports

## Directory Structure

```
src/
├── components/     # React UI components
├── services/       # Business logic and service layer
├── models/         # TypeScript interfaces and data models
├── utils/          # Utility functions and helpers
├── hooks/          # Custom React hooks
├── assets/         # Static assets (images, icons)
├── App.tsx         # Main application component
├── main.tsx        # Application entry point
└── index.css       # Global styles with Tailwind directives
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Next Steps

Follow the implementation plan in `.kiro/specs/domino-web-app/tasks.md` to build out:
1. Data models and storage layer
2. Game management services
3. Camera and image processing
4. ML-based domino detection
5. UI components
