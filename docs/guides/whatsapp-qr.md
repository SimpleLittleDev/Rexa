# WhatsApp via QR pairing

Rexa now ships a Baileys-based WhatsApp adapter. **No** Cloud API token,
phone-number ID, or webhook is required. Login is identical to WhatsApp
Web: scan a QR with your phone, the session is cached locally, and Rexa
reconnects automatically next time.

## Install the optional dependency

```bash
npm install @whiskeysockets/baileys qrcode-terminal
```

Both are listed under `peerDependenciesMeta` so they don't ship with the
default install.

## Run

```bash
rexa whatsapp           # first run prints a QR
rexa whatsapp status    # show pairing status + auth path
rexa whatsapp logout    # wipe session, force re-pairing
```

Session files live at `~/.rexa/data/whatsapp/auth/`. Treat them as
secrets — anyone with that directory can impersonate your account.

## Config

Under `app.chat.whatsapp`:

```jsonc
{
  "authDir": "data/whatsapp/auth",  // relative to ~/.rexa or absolute
  "printQR": true,                   // false to suppress terminal QR
  "browserName": "Rexa"             // shown in WhatsApp Linked Devices
}
```

## Migration from Cloud API

The previous Cloud API provider (`WHATSAPP_ACCESS_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`) has been removed.
After upgrading:

1. Drop those env vars (`rexa setup` no longer asks for them).
2. Run `rexa whatsapp` — scan the QR.
3. Old webhook endpoints are gone; if you reverse-proxy to Rexa for
   incoming messages, you can remove that.

## Notes

- WhatsApp may rate-limit aggressive connect/disconnect cycles. Keep the
  daemon running rather than re-pairing per-message.
- Voice notes / contact cards / multi-message reactions aren't wired
  through yet — the adapter exposes `sendMessage(userId, text)` and
  `sendImage(userId, buffer)` for now.
