LinkedIn Mass Unfollow
=======================

This browser extension helps you review and unfollow multiple people you follow on LinkedIn directly from the "Followers" page, without leaving the page or using a separate popup list.

What the extension does
-----------------------

- Detects the LinkedIn "Followers" page at:
  - `https://www.linkedin.com/mynetwork/network-manager/people-follow/followers/`
- Scans the page for all "Following" buttons and identifies the people you are following.
- Injects a small checkbox next to each user card on the page.
- Adds a floating control panel on the page that lets you:
  - Select or unselect individual users via their checkboxes.
  - Select or unselect all visible users at once.
  - Trigger a bulk "Unfollow selected" action.
- Executes unfollow actions one by one in the current page by:
  - Clicking the "Following" button for each selected user.
  - Waiting for the LinkedIn confirmation modal.
  - Clicking the confirm button in the modal.

How to use
----------

1. Open the LinkedIn "Followers" page in your browser:
   - `https://www.linkedin.com/mynetwork/network-manager/people-follow/followers/`
2. Wait a few seconds for the extension to inject its UI on the page.
3. You will see:
   - A checkbox next to each user you are currently following.
   - A floating panel in the bottom-right corner with:
     - A "Select all visible" option.
     - An "Unfollow selected" button.
4. Use the checkboxes (or "Select all visible") to choose who you want to unfollow.
5. Click "Unfollow selected" in the floating panel.
6. Confirm the action when asked by the extension.
7. Keep the tab open while the extension runs. When it finishes, refresh the LinkedIn page to see the updated following list.

Notes
-----

- The extension only interacts with the official LinkedIn UI. It does not call any internal or undocumented LinkedIn APIs directly.
- The extension runs only on the "Followers" manager page. Other LinkedIn pages are ignored.
- LinkedIn may change its HTML structure at any time; if the selectors used by this extension stop matching, the extension will need to be updated.

