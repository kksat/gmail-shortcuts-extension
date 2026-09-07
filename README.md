# Gmail Snooze Shortcuts (Chrome Extension)

A lightweight, non-invasive Chrome extension that adds lightning-fast keyboard shortcuts for snoozing emails in Gmail.

Designed specifically for corporate or restricted environments:
- **Zero intrusive permissions**: Runs as a minimal content script matching only `https://mail.google.com/*`.
- **No background service workers**: Uses 0 MB RAM when not on Gmail.
- **Typing-safe**: Never intercepts keystrokes while you are drafting an email, typing a search query, or interacting with inputs.
- **Compatible with native shortcuts ON or OFF**: Automatically clicks the Snooze button if Gmail native keyboard shortcuts are disabled.

---

## Shortcuts

When an email is open (or selected in your inbox list):

| Key | Action |
| :--- | :--- |
| **`b`** | Open the Snooze menu & display the shortcuts HUD |
| **`t`** | Snooze until **Tomorrow** |
| **`w`** | Snooze until **Next week** |
| **`m`** | Snooze until **Later this week** (or Weekend) |
| **`Esc`** | Cancel |

You can press `b` and then immediately press `t`, `w`, or `m` without waiting for the menu animation to finish.

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
