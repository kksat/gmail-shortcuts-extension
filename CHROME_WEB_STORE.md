# Chrome Web Store Submission Data

Reference data for the Chrome Web Store developer dashboard listing and review
forms for this extension.

## Listing information

| Field | Value |
| :--- | :--- |
| **Name** | Shortcuts for Gmail: Snooze, Search & Navigate |
| **Short description** (manifest, ≤132 chars) | One-key Gmail snooze, search by sender or subject, jump to unread — extra shortcuts that stay out of your way. |
| **Category** | Productivity |
| **Language** | English |

"Shortcuts for Gmail" is nominative use of the Gmail trademark to indicate
compatibility, per Google's branded-content guidelines; the extension is not
affiliated with or endorsed by Google.

## Single purpose

> Adds keyboard shortcuts to Gmail so users can snooze emails with single keys,
> search by sender or subject, and navigate their inbox (unread, spam, list
> jumping, pagination) without touching the mouse.

Narrow scope notes (useful if the reviewer asks for clarification):

- The extension does one thing: keyboard-driven control of Gmail's existing
  snooze, search, and navigation features. It adds no unrelated functionality.
- It works only on `https://mail.google.com/*` pages.
- It makes no network requests of its own and collects no data.

## Permission justification

### `storage`

> The `storage` permission is used solely to persist the user's own settings
> from the extension's Options page: custom shortcut keys (unsnooze, snooze
> presets), toggles for individual shortcuts, HUD visibility, and HUD timeout.
> Settings are saved locally (via `chrome.storage`, with `sync` for convenience
> across the user's own browsers). No other data is read, written, or
> transmitted. Without this permission the extension could not remember the
> user's keybind preferences between sessions.

### Host access: `https://mail.google.com/*` (content script match pattern)

> A content script must run on Gmail pages to deliver the extension's single
> purpose: it listens for keyboard input (never while the user is typing in a
> draft, search box, or other input field), detects when Gmail's Snooze menu is
> open, and triggers Gmail's own search, navigation, and snooze actions by
> simulating clicks on Gmail's existing UI. The match pattern is limited to
> `https://mail.google.com/*`; the extension does not run on, read, or modify
> any other website.

## Privacy practices (dashboard declaration)

- **Data collected**: None. Declare "I do not sell or transfer to third
  parties" and no data use disclosures, since the only stored data is the
  user's own shortcut settings, kept on their own browser.
- **Remote code**: None. All code is bundled in the extension package; there
  are no network requests (`scripts/check-no-network.sh` verifies this).
- **Broad host permissions**: Not used. Access is limited to Gmail pages.
