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
    // Marcar o botão com um índice próprio da extensão
    button.dataset.lmuIndex = String(index);

    const aria = button.getAttribute("aria-label") || "";
    let name = "";

    // Ex.: "Click to stop following Bruna Soares"
    const match = aria.match(/Click to stop following\s+(.+)$/i);
    if (match && match[1]) {
      name = match[1].trim();
    }

    if (!name) {
      const text = button.textContent || "";
      name = text.trim() || `Usuário ${index + 1}`;
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
        reject(new Error("Modal de confirmação não apareceu a tempo."));
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

    // Cobrir inglês e alguns termos em PT
    if (
      text.includes("unfollow") ||
      text.includes("deixar de seguir") ||
      text.includes("stop following") ||
      text.includes("deixar de acompanhar")
    ) {
      return btn;
    }
  }

  return null;
}

async function unfollowByIndex(index, delayMs) {
  const selector = `button[aria-label^="Click to stop following"][data-lmu-index="${index}"]`;
  const button = document.querySelector(selector);

  if (!button) {
    throw new Error(`Botão de Following não encontrado para índice ${index}.`);
  }

  button.click();

  let modal;
  try {
    modal = await waitForConfirmModal();
  } catch (err) {
    throw new Error(
      `Modal de confirmação não apareceu para índice ${index}: ${err.message}`,
    );
  }

  const confirmButton = findUnfollowButtonInModal(modal);
  if (!confirmButton) {
    throw new Error(
      `Botão de confirmar Unfollow não encontrado no modal para índice ${index}.`,
    );
  }

  confirmButton.click();

  // Pequena espera entre ações para não parecer tão "bot".
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
      console.error("Erro ao coletar usuários de Following:", err);
      sendResponse({
        ok: false,
        error: err && err.message ? err.message : String(err),
      });
    }
    return; // síncrono
  }

  if (message.type === "LMU_UNFOLLOW_SELECTED") {
    const { ids, delayMs } = message;

    (async () => {
      const results = [];

      if (!Array.isArray(ids)) {
        sendResponse({
          ok: false,
          error: "Lista de ids inválida.",
          results: [],
        });
        return;
      }

      for (const id of ids) {
        const numericId = Number(id);

        try {
          // eslint-disable-next-line no-await-in-loop
          await unfollowByIndex(numericId, delayMs || 1500);
          results.push({ id: numericId, success: true });
        } catch (err) {
          console.error("Erro ao fazer unfollow:", numericId, err);
          results.push({
            id: numericId,
            success: false,
            error: err && err.message ? err.message : String(err),
          });
        }
      }

      sendResponse({ ok: true, results });
    })();

    // Indica que vamos responder de forma assíncrona
    return true;
  }
});

