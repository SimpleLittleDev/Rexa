# Telegram Setup

Install dependency if it is not already installed:

```bash
npm install telegraf
```

Create bot token with BotFather, then set:

```bash
export TELEGRAM_BOT_TOKEN=...
```

Telegram provider can receive messages, send progress, and send confirmation buttons. Sending emails, publishing posts, deleting data, or submitting public actions still requires confirmation.

Run the Telegram provider:

```bash
rexa telegram
```

Keep that process running. Open your bot chat in Telegram and send a message.
