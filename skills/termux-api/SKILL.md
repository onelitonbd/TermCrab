---
name: termux-api
description: Control the Android phone from the agent - notifications, clipboard, battery, SMS, camera (requires termux-api package).
---

# Termux API skills

Only available on Termux with `pkg install termux-api` (+ the Termux:API app from F-Droid).

## Common commands (use the exec tool)

- Notification: `termux-notification --title "Title" --content "Body"`
- Clipboard read: `termux-clipboard-get`
- Clipboard write: `termux-clipboard-set "text"`
- Battery: `termux-battery-status`
- Wi-Fi info: `termux-wifi-connectioninfo`
- Location: `termux-location -p gps -r once` (may prompt for permission)
- Vibrate: `termux-vibrate -d 300`
- Camera: `termux-camera-photo /data/data/com.termux/files/home/photo.jpg`
- TTS: `termux-tts-speak "text here"`
- Speech to text: `termux-speech-to-text`
- SMS send: `termux-sms-send -n <number> <text>`  ← SENSITIVE
- Contacts: `termux-contact-list`
- Call log: `termux-call-log`

## Safety rules

1. **Never send SMS or call without explicit user instruction in the current turn.**
2. Never read contacts/Call logs unless the user asked for them.
3. Location: only when the user asks.
4. If a command fails with "Permission denied", tell the user to open the
   Termux:API app and grant the permission, then retry once.
