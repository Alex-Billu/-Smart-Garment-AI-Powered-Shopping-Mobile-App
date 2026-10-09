# Firebase Cloud Messaging (FCM) Push Notification Setup

> **Note**: This setup works seamlessly with both MySQL and the local SQLite fallback database.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → name it `smart-garment`
3. Disable Google Analytics (optional) → **Create project**

---

## Step 2: Add Android App

1. In the Firebase console, click the **Android** icon
2. Enter your Android package name: `com.smartgarment.mobile`
   - This must match `android.package` in `mobile/app.json`
3. Download `google-services.json`
4. Place it at: `mobile/google-services.json`
   - This file is in `.gitignore` — **never commit it**

## Step 3: Add iOS App (optional)

1. Click the **iOS** icon in Firebase console
2. Enter bundle ID: `com.smartgarment.mobile`
3. Download `GoogleService-Info.plist`
4. Place it at: `mobile/GoogleService-Info.plist`

---

## Step 4: Backend Service Account

1. In Firebase Console → **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Download the JSON file
4. Save it as `smart_garment/firebase-service-account.json`
   - **Never commit this file** (it's in `.gitignore`)
5. Set environment variable:
   ```
   FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
   ```

---

## Step 5: Configure Expo Notifications

`mobile/app.json` already has the Expo notifications plugin configured:

```json
{
  "plugins": [
    ["expo-notifications", {
      "icon": "./src/assets/notification-icon.png",
      "color": "#6366f1",
      "androidMode": "default",
      "androidCollapsedTitle": "Smart Garment"
    }]
  ]
}
```

---

## Step 6: Build with google-services.json

EAS Build automatically picks up `google-services.json` from the project root.
For local development, ensure the file exists before running `npx expo run:android`.

---

## Push Notification Flow

```
[User Action / Admin Action]
       ↓
Flask Backend
       ↓
realtime.py → send_notification(user_id, title, body, data)
       ↓ (1) Save to DB: notifications table
       ↓ (2) Emit socket event → notification.new → user_<id> room
       ↓ (3) Fetch FCM tokens from device_tokens table
       ↓
firebase-admin → messaging.send_multicast([tokens])
       ↓
FCM → Device
       ↓
Expo Notifications → Show system notification
       ↓
User taps → notifications/setup.ts response handler → Deep link
```

---

## Notification Types

| `data.type` | Deep Link Destination |
|-------------|----------------------|
| `order_status` | `/orders/<order_id>` |
| `order_created` | `/orders/<order_id>` |
| `low_stock` | `/(admin)/products` |
| `review_created` | `/product/<product_id>` |

---

## Testing Push Locally

Without Firebase credentials, the backend logs simulated pushes:
```
[PUSH LOG] Simulated Push to user 5 (tokens: 1): Title='Order #12 Update' Body='Your order status is now: Shipped'
```

To test real push notifications:
1. Build a development client: `eas build --profile development --platform android`
2. Install the APK on a physical device
3. Login and register device token (done automatically by `NotificationSetup` component)
4. Trigger an order status change from admin panel or API
