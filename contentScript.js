function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lmuNextIndex = 0;

function getOrCreateIndexForButton(button) {
  const existing = button.dataset.lmuIndex;
  if (existing != null) {
    return Number(existing);
  }
  const index = lmuNextIndex;
  lmuNextIndex += 1;
  button.dataset.lmuIndex = String(index);
  return index;
}

function collectFollowingButtons() {
  const buttons = Array.from(
    document.querySelectorAll(
      'button[aria-label^="Click to stop following"]',
    ),
  );

  const users = [];

  buttons.forEach((button) => {
    const index = getOrCreateIndexForButton(button);

    const aria = button.getAttribute("aria-label") || "";
    let name = "";

    const match = aria.match(/Click to stop following\s+(.+)$/i);
    if (match && match[1]) {
      name = match[1].trim();
    }

    if (!name) {
      const text = button.textContent || "";
      name = text.trim() || `User ${index + 1}`;
    }

    users.push({
      id: index,
      name,
    });
  });

  return users;
}

function waitForConfirmModal(timeoutMs = 5000, intervalMs = 200) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function check() {
      const modal = document.querySelector(
        'div[data-test-modal-container][data-test-is-confirm-dialog][aria-hidden="false"]',
      );

      if (modal) {
        resolve(modal);
        return;
      }

      if (Date.now() - start >= timeoutMs) {
        reject(new Error("Confirmation modal did not appear in time."));
        return;
      }

      setTimeout(check, intervalMs);
    }

    check();
  });
}

function findUnfollowButtonInModal(modal) {
  if (!modal) return null;

  const buttons = modal.querySelectorAll("button");

  for (const btn of buttons) {
    const text = (btn.textContent || "").trim().toLowerCase();
    if (!text) continue;

    if (text.includes("unfollow") || text.includes("stop following")) {
      return btn;
    }
  }

  return null;
}

async function unfollowByIndex(index, delayMs) {
  const selector = `button[aria-label^="Click to stop following"][data-lmu-index="${index}"]`;
  const button = document.querySelector(selector);

  if (!button) {
    throw new Error(`Following button not found for index ${index}.`);
  }

  button.click();

  let modal;
  try {
    modal = await waitForConfirmModal();
  } catch (err) {
    throw new Error(
      `Confirmation modal did not appear for index ${index}: ${err.message}`,
    );
  }

  const confirmButton = findUnfollowButtonInModal(modal);
  if (!confirmButton) {
    throw new Error(
      `Unfollow confirm button not found in modal for index ${index}.`,
    );
  }

  confirmButton.click();

  if (delayMs && delayMs > 0) {
    await wait(delayMs);
  }
}

function injectStyles() {
  if (document.getElementById("lmu-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "lmu-styles";
  style.textContent = `
    #lmu-control-panel {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 9999;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 8px 10px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #1d2226;
      min-width: 240px;
      max-width: 320px;
    }

    #lmu-control-panel h2 {
      font-size: 14px;
      margin: 0 0 4px;
      color: #0a66c2;
      font-weight: 600;
    }

    #lmu-control-panel p {
      margin: 0 0 6px;
      font-size: 12px;
      color: #5f5f5f;
    }

    #lmu-control-panel button {
      border: none;
      border-radius: 16px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-weight: 500;
      transition: background-color 0.12s ease, box-shadow 0.12s ease,
        transform 0.05s ease;
      background: #0a66c2;
      color: #ffffff;
      margin-left: 8px;
    }

    #lmu-control-panel button:hover {
      background: #004182;
    }

    #lmu-control-panel button:disabled {
      opacity: 0.6;
      cursor: default;
      transform: none;
    }

    #lmu-select-all-container {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #5f5f5f;
      margin-bottom: 6px;
    }

    #lmu-panel-status {
      margin-top: 4px;
      font-size: 11px;
      color: #5f5f5f;
      min-height: 14px;
    }

    .lmu-checkbox {
      margin-right: 6px;
    }
  `;

  document.head.appendChild(style);
}

function getAllLmuCheckboxes() {
  return Array.from(
    document.querySelectorAll('input.lmu-checkbox[type="checkbox"]'),
  );
}

function getSelectedLmuCheckboxes() {
  return getAllLmuCheckboxes().filter(
    (cb) => cb instanceof HTMLInputElement && cb.checked && !cb.disabled,
  );
}

function updatePanelSelectionInfo() {
  const statusEl = document.getElementById("lmu-panel-status");
  if (!statusEl) return;

  const all = getAllLmuCheckboxes();
  const selected = getSelectedLmuCheckboxes();

  if (!all.length) {
    statusEl.textContent = "No Following users detected on this page yet.";
    return;
  }

  statusEl.textContent = `${selected.length} selected out of ${all.length} loaded.`;
}

function ensureCheckboxForButton(button) {
  const index = getOrCreateIndexForButton(button);

  const existing = button.parentElement
    ? button.parentElement.querySelector(
        `input.lmu-checkbox[data-lmu-index="${index}"]`,
      )
    : null;

  if (existing) {
    return;
  }

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "lmu-checkbox";
  checkbox.dataset.lmuIndex = String(index);
  checkbox.title = "Include this user in mass unfollow";

  checkbox.addEventListener("change", () => {
    updatePanelSelectionInfo();
  });

  if (button.parentElement) {
    button.parentElement.insertBefore(checkbox, button);
  } else if (button.previousSibling) {
    button.parentNode.insertBefore(checkbox, button);
  } else {
    button.before(checkbox);
  }
}

function initFollowingItems() {
  const buttons = Array.from(
    document.querySelectorAll(
      'button[aria-label^="Click to stop following"]',
    ),
  );

  buttons.forEach((button) => {
    ensureCheckboxForButton(button);
  });

  updatePanelSelectionInfo();
}

let lmuIsRunning = false;

function createControlPanel() {
  if (document.getElementById("lmu-control-panel")) {
    return;
  }

  const panel = document.createElement("div");
  panel.id = "lmu-control-panel";

  panel.innerHTML = `
    <h2>Mass Unfollow</h2>
    <p>Select users using the checkboxes and unfollow them in bulk.</p>
    <div id="lmu-select-all-container">
      <label>
        <input type="checkbox" id="lmu-select-all" />
        <span>Select all visible</span>
      </label>
      <button id="lmu-unfollow-selected">Unfollow selected</button>
    </div>
    <div id="lmu-panel-status"></div>
  `;

  document.body.appendChild(panel);

  const selectAll = document.getElementById("lmu-select-all");
  const unfollowButton = document.getElementById("lmu-unfollow-selected");

  if (selectAll instanceof HTMLInputElement) {
    selectAll.addEventListener("change", () => {
      const all = getAllLmuCheckboxes();
      all.forEach((cb) => {
        if (cb instanceof HTMLInputElement && !cb.disabled) {
          cb.checked = selectAll.checked;
        }
      });
      updatePanelSelectionInfo();
    });
  }

  if (unfollowButton instanceof HTMLButtonElement) {
    unfollowButton.addEventListener("click", async () => {
      if (lmuIsRunning) {
        return;
      }

      const selected = getSelectedLmuCheckboxes();
      if (!selected.length) {
        const statusEl = document.getElementById("lmu-panel-status");
        if (statusEl) {
          statusEl.textContent = "Select at least one user to unfollow.";
        }
        return;
      }

      const confirmText = `Are you sure you want to unfollow ${selected.length} user(s)?`;
      if (!window.confirm(confirmText)) {
        return;
      }

      lmuIsRunning = true;
      unfollowButton.disabled = true;
      if (selectAll instanceof HTMLInputElement) {
        selectAll.disabled = true;
      }

      const statusEl = document.getElementById("lmu-panel-status");
      if (statusEl) {
        statusEl.textContent =
          "Running unfollow sequence. Please keep this tab open...";
      }

      let successCount = 0;
      let failCount = 0;

      // Run sequentially to avoid hammering the UI.
      for (const cb of selected) {
        const index = Number(cb.dataset.lmuIndex);
        try {
          // eslint-disable-next-line no-await-in-loop
          await unfollowByIndex(index, 1500);
          successCount += 1;
          cb.checked = false;
          cb.disabled = true;
        } catch (err) {
          console.error("Error while unfollowing from panel:", index, err);
          failCount += 1;
        }
        updatePanelSelectionInfo();
      }

      if (statusEl) {
        statusEl.textContent = `Done: ${successCount} success(es), ${failCount} failure(s). Refresh the page to confirm.`;
      }

      lmuIsRunning = false;
      unfollowButton.disabled = false;
      if (selectAll instanceof HTMLInputElement) {
        selectAll.disabled = false;
        selectAll.checked = false;
      }
    });
  }

  updatePanelSelectionInfo();
}

function startObserver() {
  const observer = new MutationObserver(() => {
    initFollowingItems();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function initPageUi() {
  injectStyles();
  createControlPanel();
  initFollowingItems();
  startObserver();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initPageUi();
  });
} else {
  initPageUi();
}

