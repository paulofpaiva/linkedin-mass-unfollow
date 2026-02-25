function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      if (!tabs || !tabs.length) {
        reject(new Error("Nenhuma aba ativa encontrada."));
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
          reject(new Error("Aba ativa inválida."));
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
      "Nenhum usuário de Following encontrado na página atual.";
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

async function handleLoadUsersClick() {
  setStatus("Lendo usuários na aba atual...");
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
        ? `${users.length} usuário(s) encontrado(s).`
        : "Nenhum usuário encontrado. Verifique se você está na página de Following.",
    );
  } catch (err) {
    console.error(err);

    const msg =
      (err && err.message) || String(err || "Erro ao enviar mensagem.");

    if (
      msg.includes("Could not establish connection") ||
      msg.includes("Receiving end does not exist")
    ) {
      setStatus(
        "A extensão não está injetada nesta aba. Recarregue a página de Following do LinkedIn e tente novamente.",
      );
    } else {
      setStatus(
        "Não consegui acessar a página. Abra a lista de pessoas que você segue no LinkedIn, recarregue a aba e tente de novo.",
      );
    }
  } finally {
    setControlsDisabled(false);
  }
}

async function handleUnfollowSelectedClick() {
  const ids = collectSelectedIds();

  if (!ids.length) {
    setStatus("Selecione pelo menos um usuário para fazer unfollow.");
    return;
  }

  const confirmText = `Você tem certeza que quer fazer unfollow em ${ids.length} usuário(s)?`;
  if (!window.confirm(confirmText)) {
    return;
  }

  setControlsDisabled(true);
  setStatus("Executando unfollow em sequência. Não feche esta janela...");

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
      `Concluído: ${successCount} sucesso(s), ${failCount} falha(s). Atualize a página do LinkedIn para ver o resultado.`,
    );
  } catch (err) {
    console.error(err);
    setStatus(
      "Erro ao tentar fazer unfollow. Abra o console do DevTools do popup para detalhes.",
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

  initSelectAll();
  setStatus("");
});

