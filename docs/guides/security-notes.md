# Security Notes

Rexa defaults:
- Redacts tokens, passwords, cookies, private keys, authorization headers.
- Requires confirmation for destructive or public actions.
- Does not store raw CLI credentials.
- Uses OAuth/session flows for Codex CLI, Claude Code, Gmail, and Calendar.
- File operations are sandboxed to a configured root.
- Terminal risk engine blocks dangerous commands unless confirmed.

Never allowed:
- password collection in chat prompt
- captcha/2FA bypass
- spam or engagement manipulation
- destructive actions without confirmation
- publishing/sending public content without confirmation
