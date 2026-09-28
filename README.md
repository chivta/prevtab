# prevtab

Chrome extension that jumps back through recently used tabs.

- `Ctrl+Q` (`Cmd+Q` on Mac): toggle between this tab and the previous one
- `Ctrl+Shift+Q` (`Cmd+Shift+Q` on Mac): walk further back, one tab per press

Tabs are ranked by last use across all windows. Jumping to a tab in another
window focuses that window too.

`Ctrl+Shift+Q` does not disturb the toggle. It skips the tab `Ctrl+Q` is aimed
at, never repeats a tab, and leaves the history untouched while you walk, so
`Ctrl+Q` still knows where you came from. The next `Ctrl+Q` ends the walk: the
tab you walked to becomes your newest visit, and the toggle continues from
there. Switching tabs by hand ends a walk the same way.

Starting at tabs 4, 1, 2, 3 (3 on screen):

| Key | Lands on |
| --- | --- |
| `Ctrl+Q` | 2 |
| `Ctrl+Q` | 3 |
| `Ctrl+Shift+Q` | 1 |
| `Ctrl+Shift+Q` | 4 |
| `Ctrl+Q` | 3 |
| `Ctrl+Q` | 4 |

History holds the last 10 tabs and lives in `chrome.storage.session`, so it
resets when Chrome restarts, not when the service worker sleeps.

## Install

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Load unpacked, pick this directory

## Cmd+Q on macOS does not reach Chrome

macOS claims `Cmd+Q` for Quit and delivers it to Chrome as "quit the browser",
so no extension can bind it. The manifest still declares it, so Chrome shows the
shortcut as assigned, but pressing it quits Chrome. Two ways around it:

- Pick another key at `chrome://extensions/shortcuts` (search for prevtab).
  `Cmd+E` / `Cmd+Shift+E` are free in Chrome.
- Remap at the OS level with [Karabiner-Elements](https://karabiner-elements.pqrs.org/):
  send `Cmd+Q` to Chrome as some other combo, and bind that combo here.

Linux and Windows get `Ctrl+Q` as declared. If a Linux Chrome build uses
`Ctrl+Q` for Quit, the same rebind applies.
