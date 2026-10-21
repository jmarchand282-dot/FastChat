# FastChat

FastChat is a cross-platform communication app for Android, iOS, and the web.

## Planned features

- Account registration and sign-in
- One-to-one and group messaging
- Status updates
- Voice messages and media sharing
- French, English, and Swahili
- Privacy settings and low-connection support
- Future: audio/video calls, public feed, and AI assistant

## Technology

- Expo + React Native + TypeScript
- Expo Router
- Supabase for authentication, database, realtime messaging, and storage

## Development status

Early development. The current code is a starter interface only; real authentication, messaging, storage, calls, and notifications must be implemented and tested before production use.

## Getting started

Install a current Node.js LTS release, then run:

```sh
npm install
npx expo start
```

For web development:

```sh
npx expo start --web
```

Do not commit API secrets or private credentials. Copy `.env.example` to `.env` and use only public client configuration values in the app.
