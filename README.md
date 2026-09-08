# Gmail Shortcuts (Chrome Extension)

A lightweight, non-invasive Chrome extension that adds lightning-fast, fully configurable keyboard shortcuts for snoozing emails in Gmail.

Designed specifically for corporate or restricted environments:
- **Zero intrusive permissions**: Uses only `"storage"` (to persist your preferences) and matches only `https://mail.google.com/*`.
- **Fully configurable**: Rebind the trigger key or any of the snooze action keys via Chrome's native Extension Options page.
- **Clean & non-intrusive UI**: Only appears when triggered—no permanent UI clutter in your toolbar.
- **No background service workers**: Uses 0 MB RAM when not on Gmail.
- **Typing-safe**: Never intercepts keystrokes while you are drafting an email, typing a search query, or interacting with inputs.
- **Compatible with native shortcuts ON or OFF**: Automatically clicks the Snooze button if Gmail native keyboard shortcuts are disabled.

---

## Default Shortcuts

When an email is open (or selected in your inbox list):

| Key | Action |
| :--- | :--- |
| **`b`** | Open the Snooze menu & display the shortcuts HUD |
| **`t`** | Snooze until **Tomorrow** |
| **`w`** | Snooze until **Next week** |
| **`m`** | Snooze until **Later this week** (or Weekend) |
| **`d`** | Snooze: **Select Date & Time** |
| **`Esc`** | Cancel |

You can press `b` and then immediately press your desired snooze key without waiting for the menu animation to finish.

---

## Configuration

To customize your keyboard shortcuts or HUD behavior:

1. Right-click the **Gmail Shortcuts** extension icon in your Chrome toolbar → select **Options** (or go to `chrome://extensions` → **Details** on Gmail Shortcuts → **Extension options**).
2. Configure:
   - **Snooze Trigger Key** (default: `b`)
   - **Tomorrow Key** (default: `t`)
   - **Next Week Key** (default: `w`)
   - **Later this week / Weekend Key** (default: `m`)
   - **Select Date & Time Key** (default: `d`)
   - **Show floating HUD** (toggle on/off)
   - **HUD Timeout** (seconds before the HUD auto-dismisses)
3. Click **Save Settings**.
4. Changes take effect immediately in any open Gmail tab without needing to refresh.

---

## Installation

### Method 1: Load as Unpacked Extension (Recommended)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/kksat/gmail-shortcuts-extension.git
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. In the top-right corner, toggle **Developer mode** on.
4. Click **Load unpacked** (top-left) and select the `gmail-shortcuts-extension` folder.
5. Refresh your Gmail tab (`Cmd+Shift+R` or `Ctrl+F5`).

---

### Method 2: Launch with `--load-extension` (Bypasses UI Restrictions)

If your organization's enterprise policy disables the "Load unpacked" button in the Chrome UI, you can launch Chrome with the extension loaded via command-line argument:

**macOS:**
```bash
open -a "Google Chrome" --args --load-extension="/path/to/gmail-shortcuts-extension"
```

**Windows:**
Right-click your Chrome shortcut → **Properties** → In the **Target** field, append:
```text
--load-extension="C:\path\to\gmail-shortcuts-extension"
```

**Linux:**
```bash
google-chrome --load-extension="/path/to/gmail-shortcuts-extension"
```

---

## License

GNU General Public License v3.0 (GPL-3.0). See [LICENSE](LICENSE) for details.
