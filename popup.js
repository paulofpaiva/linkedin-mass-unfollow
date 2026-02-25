const FOLLOWERS_URL =
  "https://www.linkedin.com/mynetwork/network-manager/people-follow/followers/";

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
  const sectionParagraph = document.querySelector(
    ".section p",
  );

  if (openFollowingButton instanceof HTMLButtonElement) {
    openFollowingButton.addEventListener("click", (event) => {
      event.preventDefault();
      setStatus("Redirecting to the Followers page...");
      getActiveTab()
        .then((tab) => {
          if (!tab.id) return;
          chrome.tabs.update(tab.id, { url: FOLLOWERS_URL });
        })
        .catch((err) => {
          console.error(err);
          setStatus(
            "Could not redirect to the Followers page automatically.",
          );
        });
    });
  }

  getActiveTab()
    .then((tab) => {
      const url = tab.url || "";
      if (url.startsWith(FOLLOWERS_URL)) {
        if (sectionParagraph instanceof HTMLParagraphElement) {
          sectionParagraph.textContent =
            "You are already on the LinkedIn Followers page. Use the checkboxes next to each user and the Mass Unfollow panel in the bottom-right corner of the page.";
        }
        if (openFollowingButton instanceof HTMLButtonElement) {
          openFollowingButton.style.display = "none";
        }
        setStatus("");
      } else {
        setStatus("");
      }
    })
    .catch((err) => {
      console.error(err);
      setStatus("");
    });
});

