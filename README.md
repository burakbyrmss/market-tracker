# Market Tracker

Market Tracker is a mobile app for iOS and Android that tracks cryptocurrency and foreign exchange markets. V1 runs without a backend.

## Status

Milestone M1 (scaffold and CI) is in progress. See the [roadmap](docs/roadmap.md).

## Run the app

The app uses Expo development builds. Expo Go is not supported.

1. Install Node.js 26 and run `npm ci`.
2. Build a development build for your device with `npx eas-cli@latest build --profile development --platform android`. Use `--platform ios` for an iPhone. An iPhone build needs an Apple Developer account.
3. Install the build on your device.
4. Run `npm start` and open the app on the device.

## Check your work

Run `npm run check`. It runs the type check, lint, format check, and tests. CI runs the same checks plus `expo-doctor` and `npm audit`.

After the checks pass on a push to `main`, CI queues EAS development builds for iOS and Android. Install the new build from expo.dev when a change adds or updates a native package. The job needs an `EXPO_TOKEN` repository secret.

## Documentation

- [Product requirements](docs/product/requirements.md)
- [Architecture overview](docs/architecture/overview.md)
- [Market data providers](docs/architecture/providers.md)
- [Roadmap](docs/roadmap.md)
- [Engineering standards](docs/standards/engineering.md)
- [Definition of Done](docs/standards/definition-of-done.md)
- [Risks and open questions](docs/risks.md)
- [Architecture decision records](docs/decisions/)

## License

[MIT](LICENSE)
