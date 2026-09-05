# Worker Mobile Application

Flutter mobile application for cooperative worker partners on the Sahkar Sewa Platform.

## Prerequisites
- Flutter SDK (>= 3.0.0)
- Android Studio / Xcode / VS Code with Flutter extension
- Running backend service at `http://localhost:5000/api/v1`

## Running Locally

1. Install dependencies:
   ```bash
   flutter pub get
   ```

2. Run with Android Emulator (uses `10.0.2.2` by default):
   ```bash
   flutter run
   ```

3. Run with custom backend API URL:
   ```bash
   flutter run --dart-define=API_BASE_URL=http://<YOUR_LAN_IP>:5000/api/v1
   ```
