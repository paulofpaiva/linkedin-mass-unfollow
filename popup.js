const FOLLOWING_URL =
  "https://www.linkedin.com/mynetwork/network-manager/people-follow/following/";

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      if (!tabs || !tabs.length) {
        reject(new Error("No active tab found."));
        return;
      }
      resolve(tabs[0]);
    });
  });
}

function sendMessageToActiveTab(message) {
  return getActiveTab().then(
    (tab) =>
      new Promise((resolve, reject) => {
        if (!tab.id) {
          reject(new Error("Invalid active tab."));
          return;
        }

        chrome.tabs.sendMessage(tab.id, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(response);
        });
      }),
  );
}

function setStatus(text) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = text || "";
}

function renderUserList(users) {
  const container = document.getElementById("userList");
  const selectAll = document.getElementById("selectAll");

  if (!container || !selectAll) return;

  container.innerHTML = "";

  if (!users || !users.length) {
    container.textContent =
      "No Following users found on the current page.";
    selectAll.checked = false;
    selectAll.disabled = true;
    return;
  }

  selectAll.disabled = false;
  selectAll.checked = true;

  users.forEach((user) => {
    const row = document.createElement("div");
    row.className = "user-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "user-checkbox";
    checkbox.dataset.id = String(user.id);
    checkbox.checked = true;

    const name = document.createElement("span");
    name.className = "user-name";
    name.textContent = user.name;

    row.appendChild(checkbox);
    row.appendChild(name);
    container.appendChild(row);
  });
}

function collectSelectedIds() {
  const checkboxes = Array.from(
    document.querySelectorAll(".user-checkbox"),
  ).filter((el) => el instanceof HTMLInputElement);

  const selected = checkboxes.filter((cb) => cb.checked);

  return selected.map((cb) => Number(cb.dataset.id));
}

function setControlsDisabled(disabled) {
  const loadBtn = document.getElementById("loadUsersButton");
  const unfollowBtn = document.getElementById("unfollowSelectedButton");
  const selectAll = document.getElementById("selectAll");

  [loadBtn, unfollowBtn, selectAll].forEach((el) => {
    if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
      el.disabled = disabled;
    }
  });
}

async function updateFollowingState() {
  const loadBtn = document.getElementById("loadUsersButton");
  const notFollowing = document.getElementById("notFollowingMessage");

  if (!(loadBtn instanceof HTMLButtonElement) || !notFollowing) {
    return;
  }

  try {
    const tab = await getActiveTab();
    const url = tab.url || "";
    const isFollowingPage = url.startsWith(FOLLOWING_URL);

    if (isFollowingPage) {
      loadBtn.style.display = "inline-flex";
      notFollowing.style.display = "none";
      setStatus("");
    } else {
      loadBtn.style.display = "none";
      notFollowing.style.display = "block";
      setStatus(
        "Open the LinkedIn Following page to load users.",
      );
    }
  } catch (err) {
    console.error(err);
    loadBtn.style.display = "none";
    if (notFollowing) {
      notFollowing.style.display = "block";
    }
    setStatus("Could not detect the active tab.");
  }
}

async function handleLoadUsersClick() {
  setStatus("Reading users from current tab...");
  setControlsDisabled(true);

  try {
    const response = await sendMessageToActiveTab({
      type: "LMU_SCAN_FOLLOWINGS",
    });

    const users =
      response && Array.isArray(response.users) ? response.users : [];
    renderUserList(users);
    setStatus(
      users.length
        ? `${users.length} user(s) found.`
        : "No users found. Make sure you are on the Following page.",
    );
  } catch (err) {
    console.error(err);

    const msg =
      (err && err.message) || String(err || "Failed to send message.");

    if (
      msg.includes("Could not establish connection") ||
      msg.includes("Receiving end does not exist")
    ) {
      setStatus(
        "The extension is not injected into this tab. Reload the LinkedIn Following page and try again.",
      );
    } else {
      setStatus(
        "Could not access the page. Open the list of people you follow on LinkedIn, reload the tab, and try again.",
      );
    }
  } finally {
    setControlsDisabled(false);
  }
}

async function handleUnfollowSelectedClick() {
  const ids = collectSelectedIds();

  if (!ids.length) {
    setStatus("Select at least one user to unfollow.");
    return;
  }

  const confirmText = `Are you sure you want to unfollow ${ids.length} user(s)?`;
  if (!window.confirm(confirmText)) {
    return;
  }

  setControlsDisabled(true);
  setStatus("Running unfollow sequence. Do not close this window...");

  try {
    const response = await sendMessageToActiveTab({
      type: "LMU_UNFOLLOW_SELECTED",
      ids,
      delayMs: 1500,
    });

    const results = (response && response.results) || [];
    const successCount = results.filter((r) => r && r.success).length;
    const failCount = results.length - successCount;

    setStatus(
      `Done: ${successCount} success(es), ${failCount} failure(s). Refresh the LinkedIn page to see the result.`,
    );
  } catch (err) {
    console.error(err);
    setStatus(
      "Error while trying to unfollow. Open the popup DevTools console for details.",
    );
  } finally {
    setControlsDisabled(false);
  }
}

function initSelectAll() {
  const selectAll = document.getElementById("selectAll");

  if (!selectAll || !(selectAll instanceof HTMLInputElement)) return;

  selectAll.addEventListener("change", () => {
    const checkboxes = document.querySelectorAll(".user-checkbox");
    checkboxes.forEach((el) => {
      if (el instanceof HTMLInputElement) {
        el.checked = selectAll.checked;
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const loadBtn = document.getElementById("loadUsersButton");
  const unfollowBtn = document.getElementById("unfollowSelectedButton");
  const goToFollowingLink = document.getElementById("goToFollowingLink");

  if (loadBtn instanceof HTMLButtonElement) {
    loadBtn.addEventListener("click", () => {
      handleLoadUsersClick();
    });
  }

  if (unfollowBtn instanceof HTMLButtonElement) {
    unfollowBtn.addEventListener("click", () => {
      handleUnfollowSelectedClick();
    });
  }

  if (goToFollowingLink instanceof HTMLAnchorElement) {
    goToFollowingLink.addEventListener("click", (event) => {
      event.preventDefault();
      getActiveTab()
        .then((tab) => {
          if (!tab.id) return;
          chrome.tabs.update(tab.id, { url: FOLLOWING_URL });
          setStatus("Redirecting to the Following page...");
        })
        .catch((err) => {
          console.error(err);
          setStatus(
            "Could not redirect to the Following page automatically.",
          );
        });
    });
  }

  initSelectAll();
  setStatus("");
  updateFollowingState();
});

