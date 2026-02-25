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

function findFollowingButtons() {
  const results = new Set();

  // 1) Match by aria-label in different languages (best effort)
  const ariaSelectors = [
    'button[aria-label*="stop following"]', // English
    'button[aria-label*="parar de seguir"]', // Portuguese
    'button[aria-label*="dejar de seguir"]', // Spanish
  ].join(",");

  document.querySelectorAll(ariaSelectors).forEach((btn) => {
    if (btn instanceof HTMLButtonElement) {
      results.add(btn);
    }
  });

  // 2) Fallback: match by visual text on artdeco buttons
  const actionButtons = document.querySelectorAll(
    "button.artdeco-button.artdeco-button--muted.artdeco-button--secondary",
  );

  actionButtons.forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    const text = (btn.textContent || "").trim().toLowerCase();
    if (
      text.includes("following") ||
      text.includes("seguindo") ||
      text.includes("siguiendo")
    ) {
      results.add(btn);
    }
  });

  return Array.from(results);
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

    #lmu-control-panel button.lmu-btn-secondary {
      background: #e4f0fe;
      color: #0a66c2;
    }

    #lmu-control-panel button.lmu-btn-secondary:hover {
      background: #d0e3fd;
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

    #lmu-unfollow-selected.lmu-unfollow-loading {
      cursor: progress;
    }

    #lmu-unfollow-selected.lmu-unfollow-loading::after {
      content: "";
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid #ffffff;
      border-top-color: rgba(255, 255, 255, 0.3);
      margin-left: 6px;
      box-sizing: border-box;
      animation: lmu-spin 0.8s linear infinite;
    }

    @keyframes lmu-spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    .lmu-follow-container {
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
    }

    .lmu-checkbox {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      border: 2px solid #0a66c2;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      background: #ffffff;
      margin-right: 6px;
    }

    .lmu-checkbox--checked {
      background: #0a66c2;
    }

    .lmu-checkbox--checked::after {
      content: "✓";
      color: #ffffff;
      font-size: 12px;
      line-height: 1;
    }
  `;

  document.head.appendChild(style);
}

function getAllLmuCheckboxes() {
  return Array.from(document.querySelectorAll(".lmu-checkbox"));
}

function getSelectedLmuCheckboxes() {
  return getAllLmuCheckboxes().filter(
    (cb) =>
      cb instanceof HTMLElement &&
      cb.dataset.lmuChecked === "true" &&
      cb.dataset.lmuDisabled !== "true",
  );
}

function getNextUncheckedCheckboxes(count) {
  return getAllLmuCheckboxes()
    .filter(
      (cb) =>
        cb instanceof HTMLElement &&
        cb.dataset.lmuChecked !== "true" &&
        cb.dataset.lmuDisabled !== "true",
    )
    .slice(0, count);
}

function setCheckboxChecked(el, checked) {
  if (!(el instanceof HTMLElement)) return;
  el.dataset.lmuChecked = checked ? "true" : "false";
  el.setAttribute("aria-checked", checked ? "true" : "false");
  if (checked) {
    el.classList.add("lmu-checkbox--checked");
  } else {
    el.classList.remove("lmu-checkbox--checked");
  }
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

function protectCheckboxClicksGlobally() {
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input.lmu-checkbox")
      ) {
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }
      }
    },
    true,
  );
}

function ensureCheckboxForButton(button) {
  const index = getOrCreateIndexForButton(button);

  // Prefer placing the checkbox outside the linked-area (which is the clickable area
  // that redirects to the profile), as a sibling container.
  let checkboxContainer = null;

  const linkedArea = button.closest("div.linked-area");
  if (linkedArea && linkedArea.parentElement) {
    const cardRoot = linkedArea.parentElement;
    if (!cardRoot.classList.contains("lmu-card-root")) {
      cardRoot.classList.add("lmu-card-root");
    }

    checkboxContainer = cardRoot.querySelector(
      "div.lmu-card-checkbox-container",
    );

    if (!checkboxContainer) {
      checkboxContainer = document.createElement("div");
      checkboxContainer.className = "lmu-card-checkbox-container";
      cardRoot.insertBefore(checkboxContainer, linkedArea);
    }
  }

  // Fallback: if we cannot find linked-area/cardRoot, try near the avatar row.
  if (!checkboxContainer) {
    const cardRoot = button.closest(
      "div.pmGoFvcJhtRaWMDDBaLtawgnpzaYZpMbOhWSI",
    );
    if (cardRoot) {
      const avatarRow = cardRoot.querySelector(
        "div.display-flex.align-items-center",
      );
      if (avatarRow) {
        checkboxContainer = avatarRow;
      }
    }
  }

  if (!checkboxContainer) {
    return;
  }

  const existing = checkboxContainer.querySelector(
    `.lmu-checkbox[data-lmu-index="${index}"]`,
  );

  if (existing) {
    return;
  }

  const checkbox = document.createElement("div");
  checkbox.className = "lmu-checkbox";
  checkbox.dataset.lmuIndex = String(index);
  checkbox.title = "Include this user in mass unfollow";
  checkbox.dataset.lmuChecked = "false";
  checkbox.setAttribute("role", "checkbox");
  checkbox.setAttribute("aria-checked", "false");
  checkbox.tabIndex = 0;

  function setCheckedState(el, checked) {
    el.dataset.lmuChecked = checked ? "true" : "false";
    el.setAttribute("aria-checked", checked ? "true" : "false");
    if (checked) {
      el.classList.add("lmu-checkbox--checked");
    } else {
      el.classList.remove("lmu-checkbox--checked");
    }
  }

  checkbox.addEventListener("click", (event) => {
    event.stopPropagation();
    const isChecked = checkbox.dataset.lmuChecked === "true";
    setCheckedState(checkbox, !isChecked);
    updatePanelSelectionInfo();
  });

  checkbox.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      const isChecked = checkbox.dataset.lmuChecked === "true";
      setCheckedState(checkbox, !isChecked);
      updatePanelSelectionInfo();
    }
  });

  checkboxContainer.appendChild(checkbox);
}

function initFollowingItems() {
  const buttons = findFollowingButtons();

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
      <button id="lmu-select-next-10" type="button" class="lmu-btn-secondary">Select +10</button>
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
        if (cb instanceof HTMLElement && cb.dataset.lmuDisabled !== "true") {
          setCheckboxChecked(cb, selectAll.checked);
        }
      });
      updatePanelSelectionInfo();
    });
  }

  const selectNext10Button = document.getElementById("lmu-select-next-10");
  if (selectNext10Button instanceof HTMLButtonElement) {
    selectNext10Button.addEventListener("click", () => {
      const next = getNextUncheckedCheckboxes(10);
      next.forEach((cb) => setCheckboxChecked(cb, true));
      updatePanelSelectionInfo();
    });
  }

  if (unfollowButton instanceof HTMLButtonElement) {
    if (!unfollowButton.dataset.lmuLabel) {
      unfollowButton.dataset.lmuLabel =
        unfollowButton.textContent || "Unfollow selected";
    }

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
      unfollowButton.classList.add("lmu-unfollow-loading");
      unfollowButton.textContent = "Unfollowing...";
      unfollowButton.disabled = true;
      if (selectAll instanceof HTMLInputElement) {
        selectAll.disabled = true;
      }
      if (selectNext10Button instanceof HTMLButtonElement) {
        selectNext10Button.disabled = true;
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
          if (cb instanceof HTMLElement) {
            cb.dataset.lmuChecked = "false";
            cb.dataset.lmuDisabled = "true";
            cb.classList.remove("lmu-checkbox--checked");
            cb.classList.add("lmu-checkbox--disabled");
          }
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
      unfollowButton.classList.remove("lmu-unfollow-loading");
      unfollowButton.textContent =
        unfollowButton.dataset.lmuLabel || "Unfollow selected";
      unfollowButton.disabled = false;
      if (selectAll instanceof HTMLInputElement) {
        selectAll.disabled = false;
        selectAll.checked = false;
      }
      if (selectNext10Button instanceof HTMLButtonElement) {
        selectNext10Button.disabled = false;
      }
    });
  }

  updatePanelSelectionInfo();
}

function startObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;

    for (const mutation of mutations) {
      const node = mutation.target;
      const el =
        node instanceof Element ? node : node.parentElement;

      // Ignore mutations that happen inside our own control panel,
      // to avoid feedback loops when we update the status text.
      if (el && el.closest("#lmu-control-panel")) {
        continue;
      }

      shouldUpdate = true;
      break;
    }

    if (shouldUpdate) {
      initFollowingItems();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function initPageUi() {
  injectStyles();
  createControlPanel();
  initFollowingItems();
  startObserver();
  protectCheckboxClicksGlobally();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initPageUi();
  });
} else {
  initPageUi();
}

