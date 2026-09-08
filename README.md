# Gmail Shortcuts (Chrome Extension)

A lightweight, non-invasive Chrome extension that adds lightning-fast keyboard shortcuts to Gmail's Snooze menu.

**Auto-activating:** The extension automatically detects when Gmail's Snooze menu appears (opened via Gmail's native shortcut like `b`, clicking the Snooze button, or from the right-click context menu) and enables instant single-key actions.

Designed specifically for corporate or restricted environments:
- **Zero intrusive permissions**: Uses only `"storage"` (to persist keybind preferences) and matches only `https://mail.google.com/*`.
- **Auto-activating**: Hooks directly into Gmail's native Snooze menu without interfering with your existing Gmail shortcuts.
- **Dynamic Slot Shortcuts (1, 2, 3)**: Instantly pick whichever suggested date/time presets Gmail offers (Tomorrow, Later today, Next week, etc.).
- **Unsnooze Support (U)**: Automatically detects when an email is already snoozed and activates `U` to unsnooze.
- **Clean & non-intrusive UI**: Only appears when the Snooze menu is open—zero permanent toolbar clutter.
- **No background service workers**: Uses 0 MB RAM when not on Gmail.
- **Typing-safe**: Never intercepts keystrokes while drafting an email, typing a search query, or interacting with inputs.

---

## Default Shortcuts

Once the Snooze menu is open on screen:

### Dynamic Suggested Slots & Actions
| Key | Action |
| :--- | :--- |
| **`1`** | Select **1st Dynamic Option** (e.g. *Tomorrow* or *Later today*) |
| **`2`** | Select **2nd Dynamic Option** (e.g. *Later this week* or *This weekend*) |
| **`3`** | Select **3rd Dynamic Option** (e.g. *Next week*) |
| **`u`** | **Unsnooze** (active automatically when email is currently snoozed) |
| **`d`** | Open **Select Date & Time** custom picker |
| **`Esc`** | Cancel |

### Semantic / Named Fallbacks
You can also always press the corresponding letter directly:
- **`t`** → Tomorrow
- **`w`** → Next week
- **`m`** → Later this week / Weekend

---

## Configuration

To customize your keyboard shortcuts or HUD behavior:

1. Right-click the **Gmail Shortcuts** extension icon in your Chrome toolbar → select **Options** (or go to `chrome://extensions` → **Details** on Gmail Shortcuts → **Extension options**).
2. Configure:
   - **Dynamic Option keys** (default: `1`, `2`, `3`)
   - **Unsnooze key** (default: `u`)
   - **Named shortcut keys** (`t`, `w`, `m`, `d`)
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
