function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectFollowingButtons() {
  const buttons = Array.from(
    document.querySelectorAll(
      'button[aria-label^="Click to stop following"]',
    ),
  );

  const users = [];

  buttons.forEach((button, index) => {
    button.dataset.lmuIndex = String(index);

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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") {
    return;
  }

  if (message.type === "LMU_SCAN_FOLLOWINGS") {
    try {
      const users = collectFollowingButtons();
      sendResponse({ ok: true, users });
    } catch (err) {
      console.error("Error while collecting Following users:", err);
      sendResponse({
        ok: false,
        error: err && err.message ? err.message : String(err),
      });
    }
    return;
  }

  if (message.type === "LMU_UNFOLLOW_SELECTED") {
    const { ids, delayMs } = message;

    (async () => {
      const results = [];

      if (!Array.isArray(ids)) {
        sendResponse({
          ok: false,
          error: "Invalid id list.",
          results: [],
        });
        return;
      }

      for (const id of ids) {
        const numericId = Number(id);

        try {
          await unfollowByIndex(numericId, delayMs || 1500);
          results.push({ id: numericId, success: true });
        } catch (err) {
          console.error("Error while unfollowing:", numericId, err);
          results.push({
            id: numericId,
            success: false,
            error: err && err.message ? err.message : String(err),
          });
        }
      }

      sendResponse({ ok: true, results });
    })();

    return true;
  }
});

