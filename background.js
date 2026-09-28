// Tab history with two movements.
//
// switch-previous toggles between the current tab and the one before it: each
// jump promotes its target to the head of the list, so pressing it twice lands
// you back where you started.
//
// switch-previous-previous walks further back without touching the list. It
// starts at WALK_START (skipping the tab switch-previous is aimed at) and steps
// one deeper per press. The next switch-previous ends the walk: the tab the walk
// landed on is promoted as a normal visit, then the toggle runs from there.

const STATE_KEY = "state";
const MRU_LIMIT = 10;
const PREVIOUS = 1;
const WALK_START = 2;

const EMPTY_STATE = {
  // Tab ids, newest first. Index 0 is where navigation is measured from, which
  // during a walk is the tab the walk started at, not the visible tab.
  mru: [],
  // Index into mru while walking back, null when not walking.
  cursor: null,
  // Tab this extension just activated. Its own onActivated must not count as a
  // user switch. Cleared by the first event naming a different tab.
  pending: null,
};

async function loadState() {
  const stored = await chrome.storage.session.get(STATE_KEY);
  return { ...EMPTY_STATE, ...stored[STATE_KEY] };
}

async function saveState(state) {
  await chrome.storage.session.set({
    [STATE_KEY]: { ...state, mru: state.mru.slice(0, MRU_LIMIT) },
  });
}

// Moves a tab to the head of the list. Mutates state in place. Every caller
// clears the cursor first, so this never has to keep a walk position valid.
function promote(state, tabId) {
  const at = state.mru.indexOf(tabId);
  if (at !== -1) state.mru.splice(at, 1);
  state.mru.unshift(tabId);
}

function drop(state, tabId) {
  const at = state.mru.indexOf(tabId);
  if (at === -1) return;
  state.mru.splice(at, 1);
  if (state.cursor !== null && at < state.cursor) state.cursor--;
}

// Removes tabs closed while the service worker was asleep, so a dead entry
// never shifts the position a shortcut is counting to.
async function pruneClosed(state) {
  for (const tabId of [...state.mru]) {
    try {
      await chrome.tabs.get(tabId);
    } catch {
      drop(state, tabId);
    }
  }
}

// Ends a walk by promoting the tab it landed on, so the list measures from the
// tab actually on screen rather than from where the walk began.
function commitWalk(state) {
  if (state.cursor === null) return;
  const landed = state.mru[state.cursor];
  state.cursor = null;
  if (landed !== undefined) promote(state, landed);
}

// A real tab switch by the user: it ends any walk and reorders the list.
async function recordVisit(tabId) {
  const state = await loadState();
  if (tabId === state.pending) return;
  state.pending = null;
  commitWalk(state);
  promote(state, tabId);
  await saveState(state);
}

async function goTo(state, tabId) {
  state.pending = tabId;
  await saveState(state);
  const tab = await chrome.tabs.get(tabId);
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
}

async function switchPrevious() {
  const state = await loadState();
  await pruneClosed(state);
  commitWalk(state);
  const target = state.mru[PREVIOUS];
  if (target === undefined) return;
  promote(state, target);
  await goTo(state, target);
}

async function switchPreviousPrevious() {
  const state = await loadState();
  await pruneClosed(state);
  const next = state.cursor === null ? WALK_START : state.cursor + 1;
  const target = state.mru[next];
  if (target === undefined) return; // already at the oldest tab we track
  state.cursor = next;
  await goTo(state, target);
}

const COMMANDS = {
  "switch-previous": switchPrevious,
  "switch-previous-previous": switchPreviousPrevious,
};

chrome.tabs.onActivated.addListener(({ tabId }) => recordVisit(tabId));

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const state = await loadState();
  drop(state, tabId);
  await saveState(state);
});

// Switching windows activates no tab, so read the tab focused there instead.
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (tab) await recordVisit(tab.id);
});

chrome.commands.onCommand.addListener((command) => COMMANDS[command]?.());
