# Chat Providers

Rexa currently supports these runnable chat surfaces:

## CLI

```bash
rexa chat
```

This is the default local Termux/Linux/Windows interactive chat.

## Telegram

Create a bot with BotFather, then set the token:

```bash
export TELEGRAM_BOT_TOKEN="123456:your-token"
rexa telegram
```

If you select `telegram` in `rexa setup`, Rexa will immediately ask for the BotFather token and save it to local `.env` with file permission `600`.

For durable Termux usage, put the export in `~/.bashrc` or `~/.profile`.

## WhatsApp

Rexa uses WhatsApp Cloud API webhook mode.

Set these env vars:

```bash
export WHATSAPP_ACCESS_TOKEN="your-meta-access-token"
export WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"
export WHATSAPP_VERIFY_TOKEN="choose-a-random-verify-token"
export REXA_WHATSAPP_PORT=8792
```

Run:

```bash
rexa whatsapp
```

Webhook URL:

```text
http://127.0.0.1:8792/webhook
```

For Meta Cloud API, expose that URL through a tunnel or VPS reverse proxy, then configure the same verify token in Meta Developer dashboard. Rexa does not ask for your WhatsApp password.

## REST API

```bash
rexa api
```

Send a message:

```bash
curl -s http://127.0.0.1:8786/chat \
  -H 'content-type: application/json' \
  -d '{"userId":"local","message":"hai"}'
```

Health:

```bash
curl http://127.0.0.1:8786/health
```

## WebSocket

```bash
rexa ws
```

Default endpoint:

```text
ws://127.0.0.1:8788
```

Set a custom port:

```bash
export REXA_WS_PORT=8790
rexa ws
```

## Local Web Chat

```bash
rexa web
```

Open:

```text
http://127.0.0.1:8787
```

Set a custom port:

```bash
export REXA_WEB_PORT=8791
rexa web
```

## Notes

- All providers use the same Rexa agent runtime and config.
- Progress messages are sent before the final response.
- Risky actions still go through Rexa confirmation policy.
- Telegram and WebSocket dependencies are `telegraf` and `ws`.
- Browser tool events can send progress and screenshot paths/images back to the active chat provider.
