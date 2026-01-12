import { deletePolicyDocument, listPolicyDocuments, uploadPolicyDocument } from "../lib/policy-upload.js";
import { loadPolicyData, savePolicyData } from "./policy-data.js";

export const initAdmin = () => {
  const isAdminPage = document.body?.dataset.page === "policy-admin";
  if (!isAdminPage) return;

  const grid = document.querySelector("[data-admin-grid]");
  if (!grid) return;

  let policyData = loadPolicyData();
  renderAdminGrid(grid, policyData);

  grid.addEventListener("click", async (event) => {
    const manageToggle = event.target.closest("[data-action='toggle-manage']");
    if (manageToggle) {
      const module = manageToggle.closest(".admin-module");
      if (!module) return;
      const isManaging = module.classList.toggle("is-managing");
      manageToggle.textContent = isManaging ? "Done" : "Manage policies";
      return;
    }

    const addPolicyButton = event.target.closest("[data-action='add-policy']");
    if (addPolicyButton) {
      const module = addPolicyButton.closest(".admin-module");
      if (!module) return;
      const input = module.querySelector(".admin-input");
      const moduleId = module.dataset.module;
      const name = input?.value.trim();
      if (!name || !moduleId) return;
      policyData = addPolicy(policyData, moduleId, name);
      savePolicyData(policyData);
      renderAdminGrid(grid, policyData);
      showToast("Policy added.", "info");
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const item = actionButton.closest(".admin-policy");
    const module = actionButton.closest(".admin-module");
    if (!item || !module) return;

    const action = actionButton.dataset.action;
    if (action === "upload") {
      const input = item.querySelector(".hidden-input");
      input?.click();
    }

    if (action === "edit") {
      const nextData = toggleEdit(item, actionButton, policyData, module.dataset.module);
      if (nextData) {
        policyData = nextData;
        savePolicyData(policyData);
      }
    }

    if (action === "delete-policy") {
      const nextData = await confirmPolicyDelete({ item, moduleId: module.dataset.module, policyData, grid });
      if (nextData) {
        policyData = nextData;
      }
    }
  });

  grid.addEventListener("click", async (event) => {
    const deleteFileButton = event.target.closest("[data-action='delete-file']");
    if (!deleteFileButton) return;
    const item = deleteFileButton.closest(".admin-policy");
    if (!item) return;
    const filePath = deleteFileButton.dataset.filePath;
    const policyId = item.dataset.policyId;
    if (!filePath || !policyId) return;
    const confirmed = await confirmDialog({
      title: "Delete file",
      message: "Remove this file from the policy?",
      confirmText: "Delete",
    });
    if (!confirmed) return;
    await deleteFile({ item, policyId, filePath });
  });

};

const renderAdminGrid = (grid, data) => {
  grid.innerHTML = data
    .map((module) => {
      const policyItems = module.policies
        .map(
          (policy) => `
            <li class="admin-policy" data-policy-id="${policy.id}">
              <div class="policy-main">
                <span class="policy-name">${escapeHtml(policy.name)}</span>
              </div>
              <div class="admin-actions">
                <button class="icon-btn" type="button" data-action="upload">Upload</button>
                <button class="icon-btn" type="button" data-action="edit">Edit</button>
                <button class="icon-btn danger policy-delete-btn" type="button" data-action="delete-policy">Delete</button>
              </div>
              <input class="hidden-input" type="file" />
              <div class="policy-files">Loading files...</div>
            </li>
          `
        )
        .join("");

      return `
        <article class="admin-module" data-module="${module.id}">
          <header class="admin-module-head">
            <div>
              <h2>${escapeHtml(module.name)}</h2>
              <p>${escapeHtml(module.description)}</p>
            </div>
            <div class="admin-module-actions">
              <button class="icon-btn" type="button" data-action="toggle-manage">Manage policies</button>
            </div>
          </header>
          <div class="admin-add">
            <input class="admin-input" type="text" placeholder="New policy name" />
            <button class="admin-add-btn" type="button" data-action="add-policy">Add policy</button>
          </div>
          <ul class="admin-policy-list">
            ${policyItems}
          </ul>
        </article>
      `;
    })
    .join("");

  grid.querySelectorAll(".admin-policy").forEach((item) => {
    const input = item.querySelector(".hidden-input");
    input?.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      await uploadFile(item, file);
      input.value = "";
    });
    loadPolicyFiles(item);
  });
};

const addPolicy = (data, moduleId, name) => {
  const next = data.map((module) => {
    if (module.id !== moduleId) return module;
    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `temp-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    return {
      ...module,
      policies: [...module.policies, { id, name }],
    };
  });
  return next;
};

const toggleEdit = (item, button, policyData, moduleId) => {
  const name = item.querySelector(".policy-name");
  if (!name) return;

  if (item.classList.contains("is-editing")) {
    const input = item.querySelector(".policy-edit-input");
    if (!input) return;
    const nextValue = input.value.trim();
    let nextData = null;
    if (nextValue) {
      name.textContent = nextValue;
      nextData = updatePolicyName(policyData, moduleId, item.dataset.policyId, nextValue);
    }
    input.remove();
    name.classList.remove("is-hidden");
    button.textContent = "Edit";
    item.classList.remove("is-editing");
    return nextData;
  }

  const input = document.createElement("input");
  input.type = "text";
  input.className = "policy-edit-input";
  input.value = name.textContent.trim();
  name.classList.add("is-hidden");
  name.insertAdjacentElement("afterend", input);
  button.textContent = "Save";
  item.classList.add("is-editing");
  input.focus();
  return null;
};

const updatePolicyName = (data, moduleId, policyId, nextName) => {
  if (!policyId) return;
  return data.map((module) => {
    if (module.id !== moduleId) return module;
    return {
      ...module,
      policies: module.policies.map((policy) =>
        policy.id === policyId ? { ...policy, name: nextName } : policy
      ),
    };
  });
};

const confirmPolicyDelete = async ({ item, moduleId, policyData, grid }) => {
  const name = item.querySelector(".policy-name")?.textContent || "this policy";
  const first = await confirmDialog({
    title: "Delete policy",
    message: `Remove ${name} from this module?`,
    confirmText: "Continue",
  });
  if (!first) return;
  const second = await confirmDialog({
    title: "Confirm delete",
    message: "This cannot be undone. Delete the policy?",
    confirmText: "Delete",
  });
  if (!second) return;

  const next = policyData.map((module) => {
    if (module.id !== moduleId) return module;
    return {
      ...module,
      policies: module.policies.filter((policy) => policy.id !== item.dataset.policyId),
    };
  });
  savePolicyData(next);
  renderAdminGrid(grid, next);
  showToast("Policy deleted.", "info");
  return next;
};

const uploadFile = async (item, file) => {
  const policyId = item.dataset.policyId;
  if (!policyId) return;
  showToast("Uploading file...", "info");
  try {
    await uploadPolicyDocument({ policyId, file });
    showToast("Uploaded.", "info");
    await loadPolicyFiles(item);
  } catch (error) {
    console.error("Upload failed:", error);
    showToast(error?.message || "Upload failed. Please try again.", "error");
  }
};

const deleteFile = async ({ item, policyId, filePath }) => {
  showToast("Deleting file...", "info");
  try {
    await deletePolicyDocument({ policyId, filePath });
    showToast("File deleted.", "info");
    await loadPolicyFiles(item);
  } catch (error) {
    console.error("Delete failed:", error);
    showToast(error?.message || "Delete failed. Please try again.", "error");
  }
};

const loadPolicyFiles = async (item) => {
  const policyId = item.dataset.policyId;
  const container = item.querySelector(".policy-files");
  if (!policyId || !container) return;

  container.textContent = "Loading files...";
  try {
    const files = await listPolicyDocuments({ policyId });
    container.innerHTML = "";
    if (!files.length) {
      container.textContent = "No files yet.";
      return;
    }

    const label = document.createElement("div");
    label.className = "policy-files-label";
    label.textContent = "Files";
    const list = document.createElement("ul");
    list.className = "policy-files-list";
    files.forEach((doc) => {
      const li = document.createElement("li");
      const name = doc.file_path ? doc.file_path.split("/").pop() : "Unknown file";
      const fileButton = document.createElement("button");
      fileButton.type = "button";
      fileButton.className = "file-link";
      fileButton.textContent = name;
      fileButton.disabled = !doc.url;
      if (doc.url) {
        fileButton.dataset.fileUrl = doc.url;
        fileButton.dataset.fileName = name;
        fileButton.addEventListener("dblclick", () => {
          openDocumentViewer({ url: doc.url, name });
        });
      }
      li.appendChild(fileButton);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "icon-btn danger";
      deleteBtn.dataset.action = "delete-file";
      deleteBtn.dataset.filePath = doc.file_path || "";
      deleteBtn.textContent = "Delete";
      li.appendChild(deleteBtn);
      list.appendChild(li);
    });
    container.appendChild(label);
    container.appendChild(list);
  } catch (error) {
    console.error("Failed to load policy files:", error);
    container.textContent = "Unable to load files.";
  }
};

const confirmDialog = ({ title, message, confirmText = "OK", cancelText = "Cancel" }) =>
  new Promise((resolve) => {
    let modal = document.querySelector(".dialog-backdrop");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "dialog-backdrop";
      modal.innerHTML = `
        <div class="dialog" role="dialog" aria-modal="true">
          <h3 class="dialog-title"></h3>
          <p class="dialog-message"></p>
          <div class="dialog-actions">
            <button class="btn ghost" data-dialog="cancel"></button>
            <button class="btn primary" data-dialog="confirm"></button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    modal.querySelector(".dialog-title").textContent = title;
    modal.querySelector(".dialog-message").textContent = message;
    modal.querySelector("[data-dialog='cancel']").textContent = cancelText;
    modal.querySelector("[data-dialog='confirm']").textContent = confirmText;
    modal.classList.add("is-visible");

    const cleanup = () => {
      modal.classList.remove("is-visible");
      modal.replaceWith(modal.cloneNode(true));
    };

    modal.querySelector("[data-dialog='cancel']").addEventListener("click", () => {
      cleanup();
      resolve(false);
    });
    modal.querySelector("[data-dialog='confirm']").addEventListener("click", () => {
      cleanup();
      resolve(true);
    });
  });

const showToast = (message, variant = "info") => {
  if (!message) return;
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast--${variant}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast--hide");
    setTimeout(() => toast.remove(), 300);
  }, 2400);
};

const openDocumentViewer = ({ url, name }) => {
  if (!url) return;
  const extension = String(name || "").split(".").pop()?.toLowerCase();
  const isPdf = extension === "pdf";
  const isDoc = extension === "doc" || extension === "docx";
  let viewerUrl = url;

  if (isDoc) {
    viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
  }

  const modal = ensureViewerModal();
  const frame = modal.querySelector(".viewer-frame");
  const title = modal.querySelector(".viewer-title");
  const fallback = modal.querySelector(".viewer-fallback");
  const loader = modal.querySelector(".viewer-loader");
  const download = modal.querySelector("[data-viewer-download]");

  title.textContent = name || "Document preview";
  fallback.textContent = "";
  frame.style.opacity = "0";
  loader.classList.add("is-visible");
  frame.onload = () => {
    setTimeout(() => {
      loader.classList.remove("is-visible");
      frame.style.opacity = "1";
    }, 200);
  };
  setTimeout(() => {
    if (loader.classList.contains("is-visible")) {
      loader.classList.remove("is-visible");
      frame.style.opacity = "1";
    }
  }, 3000);
  if (isPdf) {
    loadPdfIntoFrame({ frame, loader, url });
  } else {
    frame.src = viewerUrl;
  }
  if (download) {
    download.href = url;
    download.setAttribute("download", name || "document");
  }
  frame.dataset.type = isPdf ? "pdf" : isDoc ? "doc" : "other";
  modal.classList.add("is-visible");

  if (!isPdf && !isDoc) {
    fallback.textContent = "Preview not available for this file type.";
  }
};

const ensureViewerModal = () => {
  let modal = document.querySelector(".viewer-backdrop");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.className = "viewer-backdrop";
  modal.innerHTML = `
    <div class="viewer" role="dialog" aria-modal="true">
      <div class="viewer-head">
        <span class="viewer-title"></span>
        <div class="viewer-actions">
          <a class="viewer-btn" data-viewer-download target="_blank" rel="noopener">Download</a>
          <button class="viewer-btn" type="button" data-viewer-close>Close</button>
        </div>
      </div>
      <div class="viewer-body">
        <iframe title="Document preview" class="viewer-frame"></iframe>
        <div class="viewer-loader" aria-hidden="true">
          <div class="viewer-spinner"></div>
          <span>Loading preview…</span>
        </div>
        <div class="viewer-fallback"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => {
    const frame = modal.querySelector("iframe");
    const loader = modal.querySelector(".viewer-loader");
    frame.src = "";
    loader.classList.remove("is-visible");
    frame.style.opacity = "0";
    modal.classList.remove("is-visible");
  };

  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
    if (event.target.closest("[data-viewer-close]")) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-visible")) {
      close();
    }
  });

  return modal;
};

const loadPdfIntoFrame = async ({ frame, loader, url }) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to load PDF.");
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    frame.src = blobUrl;
    frame.onload = () => {
      setTimeout(() => {
        loader.classList.remove("is-visible");
        frame.style.opacity = "1";
        URL.revokeObjectURL(blobUrl);
      }, 200);
    };
  } catch (error) {
    console.error("PDF load failed:", error);
    loader.classList.remove("is-visible");
    frame.style.opacity = "1";
  }
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
