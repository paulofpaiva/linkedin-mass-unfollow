LinkedIn Mass Unfollow
=======================

This browser extension helps you review and unfollow multiple people you follow on LinkedIn from the "Following" page.

What the extension does
-----------------------

- Detects the LinkedIn "Following" page at:
  - `https://www.linkedin.com/mynetwork/network-manager/people-follow/following/`
- Scans the page for all "Following" buttons and extracts the names of the people you are following.
- Shows these users in the extension popup with a checkbox for each one.
- Lets you:
  - Select or unselect individual users.
  - Select or unselect all users at once.
- Executes unfollow actions one by one in the active tab by:
  - Clicking the "Following" button for each selected user.
  - Waiting for the LinkedIn confirmation modal.
  - Clicking the confirm button in the modal.

How to use
----------

1. Open the LinkedIn "Following" page in your browser:
   - `https://www.linkedin.com/mynetwork/network-manager/people-follow/following/`
2. Open the extension popup from the browser toolbar.
3. Click the button "Load users from current tab".
4. Wait for the list of users to appear.
5. Use the checkboxes (or the "Select all" option) to choose who you want to unfollow.
6. Click "Unfollow selected".
7. Confirm the action in the popup when asked.
8. Keep the tab and popup open while the extension runs. When it finishes, refresh the LinkedIn page to see the updated following list.

Notes
-----

- The extension only interacts with the official LinkedIn UI. It does not call any internal or undocumented LinkedIn APIs directly.
- The extension runs only on the "Following" manager page. Other LinkedIn pages are ignored.
- LinkedIn may change its HTML structure at any time; if the selectors used by this extension stop matching, the extension will need to be updated.

