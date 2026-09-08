# Gmail Shortcuts (Chrome Extension)

A lightweight, non-invasive Chrome extension that adds lightning-fast keyboard shortcuts for email navigation and Gmail's Snooze menu.

Designed specifically for corporate or restricted environments:
- **Zero intrusive permissions**: Uses only `"storage"` (to persist keybind preferences) and matches only `https://mail.google.com/*`.
- **List Navigation (`gg` & `G`)**: Jump straight to the **first** (`gg`) or **last** (`G` / Shift+G) email in the current view.
- **List Pagination (`]]` & `[[`)**: Jump to Next / Previous page when viewing email lists (Inbox, Sent, Search, etc.).
- **Strict Context Awareness**: Navigation shortcuts are only active in list view, never inside open email threads.
- **Auto-activating Snooze menu**: Detects when Gmail's Snooze menu appears and enables instant single-key actions.
- **Dynamic Slot Shortcuts (1, 2, 3...)**: Instantly pick whichever suggested date/time presets Gmail offers (Tomorrow, Later today, Next week, etc.).
- **Multi-line HUD**: Displays all static shortcuts on one line and dynamic options on their own separate line.
- **Hover-Protected HUD**: Hint panel never disappears while the mouse is over it, and options are clickable.
- **Unsnooze Support (U)**: Automatically detects when an email is already snoozed and activates `U` to unsnooze.
- **Typing-safe**: Never intercepts keystrokes while drafting an email, typing a search query, or interacting with inputs.

---

## Shortcuts

### 1. Email List Navigation (Only in List View)
When viewing email lists (Inbox, Sent, Snoozed, Search, Labels) and **not** inside an open email:

| Shortcut | Action |
| :--- | :--- |
| **`gg`** | **Jump to Top Email** (1st email on the page) |
| **`G`** (`Shift+g`) | **Jump to Bottom Email** (last email on the page) |
| **`]]`** | **Next page** (Older emails) |
| **`[[`** | **Previous page** (Newer emails) |

---

### 2. Snooze Menu (When Menu is Open)
When Gmail's Snooze menu is open on screen, the HUD shows:

```text
Snooze: [T] Tomorrow  |  [W] Next week  |  [M] Later this week  |  [D] Pick date  |  [Esc] Cancel
[1] Tomorrow  •  [2] Later this week  •  [3] Next week
```

*(If the email is already snoozed, **`[U] Unsnooze`** is also displayed).*

#### Static Shortcuts
| Key | Action |
| :--- | :--- |
| **`u`** | **Unsnooze** (active when email is currently snoozed) |
| **`t`** | Snooze until **Tomorrow** |
| **`w`** | Snooze until **Next week** |
| **`m`** | Snooze until **Later this week** (or Weekend) |
| **`d`** | Open **Select Date & Time** custom picker |
| **`Esc`** | Cancel |

#### Dynamic Suggested Slots
| Key | Action |
| :--- | :--- |
| **`1`** | Select **1st Dynamic Option** (e.g. *Tomorrow* or *Later today*) |
| **`2`** | Select **2nd Dynamic Option** (e.g. *Later this week* or *This weekend*) |
| **`3`** | Select **3rd Dynamic Option** (e.g. *Next week*) |

---

## Configuration

To customize your keyboard shortcuts or HUD behavior:

1. Right-click the **Gmail Shortcuts** extension icon in your Chrome toolbar → select **Options** (or go to `chrome://extensions` → **Details** on Gmail Shortcuts → **Extension options**).
2. Configure:
   - **Enable `gg` and `G` shortcuts** (toggle on/off)
   - **Enable `]]` and `[[` pagination shortcuts** (toggle on/off)
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
