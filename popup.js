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

function setStatus(text) {
  const el = document.getElementById("status");
  if (!el) return;
  el.textContent = text || "";
}

document.addEventListener("DOMContentLoaded", () => {
  const openFollowingButton = document.getElementById("openFollowingButton");

  if (openFollowingButton instanceof HTMLButtonElement) {
    openFollowingButton.addEventListener("click", (event) => {
      event.preventDefault();
      setStatus("Redirecting to the Following page...");
      getActiveTab()
        .then((tab) => {
          if (!tab.id) return;
          chrome.tabs.update(tab.id, { url: FOLLOWING_URL });
        })
        .catch((err) => {
          console.error(err);
          setStatus(
            "Could not redirect to the Following page automatically.",
          );
        });
    });
  }

  setStatus("");
});

