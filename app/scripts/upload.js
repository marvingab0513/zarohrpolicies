import { listPolicyDocuments, uploadPolicyDocument } from "../lib/policy-upload.js";

export const initUpload = () => {
  const body = document.body;
  const grid = document.querySelector(".dashboard-grid");

  if (!grid) return;

  const isAdmin = () => document.body.dataset.role === "admin";
  const policyItems = grid.querySelectorAll(".policy-item");

  if (isAdmin()) {
    policyItems.forEach((item) => {
      const policyId = item.dataset.policyId || null;
      if (policyId) {
        updatePolicyStatus({ item, policyId, isAdmin: true });
      }
    });
  }

  window.addEventListener("role-ready", () => {
    if (!isAdmin()) return;
    policyItems.forEach((item) => {
      const policyId = item.dataset.policyId || null;
      if (policyId) {
        updatePolicyStatus({ item, policyId, isAdmin: true });
      }
    });
  });

  policyItems.forEach((item) => {
    item.addEventListener("click", (event) => {
      if (event.target.closest(".policy-add")) return;
      event.stopPropagation();
      grid.querySelectorAll(".policy-item").forEach((entry) => {
        entry.classList.remove("is-selected");
      });
      item.classList.add("is-selected");
      const policyId = item.dataset.policyId || null;
      window.selectedPolicyId = policyId;
      loadPolicyFiles({ item, policyId, isAdmin: isAdmin() });
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest(".policy-item")) return;
    grid.querySelectorAll(".policy-item").forEach((entry) => {
      entry.classList.remove("is-selected");
    });
    window.selectedPolicyId = null;
  });
};

const ensureUploadControl = ({ item, policyId, isAdmin }) => {
  const existingButton = item.querySelector(".policy-add");
  const existingInput = item.querySelector(".policy-input");

  if (!isAdmin) {
    existingButton?.remove();
    existingInput?.remove();
    return null;
  }

  let input = existingInput;
  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.className = "policy-input";
    input.addEventListener("change", async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      await runUpload({ item, policyId, input, file });
    });
    item.appendChild(input);
  }

  let button = existingButton;
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "policy-add";
    button.setAttribute("aria-label", "Upload policy document");
    button.innerHTML = "+";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      input.click();
    });
    item.appendChild(button);
  }

  if (policyId) {
    button.dataset.policyId = policyId;
    input.dataset.policyId = policyId;
  }

  return { button, input };
};

const runUpload = async ({ item, policyId, input, file }) => {
  if (document.body.dataset.role && document.body.dataset.role !== "admin") {
    showToast("Only admins can upload.", "error");
    return;
  }
  if (!policyId) {
    showToast("Select a policy before uploading.", "error");
    return;
  }

  showToast("Uploading file...", "info");
  try {
    await uploadPolicyDocument({ policyId, file });
    input.value = "";
    showToast("Uploaded.", "info");
    await loadPolicyFiles({ item, policyId, isAdmin: true });
  } catch (error) {
    console.error("Upload failed:", error);
    showToast(error?.message || "Upload failed. Please try again.", "error");
  }
};

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

const updatePolicyStatus = async ({ item, policyId, isAdmin }) => {
  if (!item || !policyId) return;
  const uploadControl = ensureUploadControl({ item, policyId, isAdmin });
  if (!uploadControl?.button) return;
  uploadControl.button.classList.add("is-hidden");
  try {
    const files = await listPolicyDocuments({ policyId });
    uploadControl.button.classList.toggle("is-hidden", files.length > 0);
  } catch (error) {
    console.error("Failed to check policy files:", error);
  }
};

const loadPolicyFiles = async ({ item, policyId, isAdmin }) => {
  if (!item || !policyId) return;
  let container = item.querySelector(".policy-files");
  if (!container) {
    container = document.createElement("div");
    container.className = "policy-files";
    item.appendChild(container);
  }
  container.textContent = "Loading files...";

  try {
    const files = await listPolicyDocuments({ policyId });
    container.innerHTML = "";

    const uploadControl = ensureUploadControl({ item, policyId, isAdmin });

    if (!files.length) {
      container.textContent = isAdmin ? "No files yet." : "No files available.";
      if (uploadControl?.button) {
        uploadControl.button.classList.remove("is-hidden");
      }
      return;
    }

    if (uploadControl?.button) {
      uploadControl.button.classList.add("is-hidden");
    }

    const label = document.createElement("div");
    label.className = "policy-files-label";
    label.textContent = "Files";
    const list = document.createElement("ul");
    list.className = "policy-files-list";
    files.forEach((doc) => {
      const li = document.createElement("li");
      const name = doc.file_path ? doc.file_path.split("/").pop() : "Unknown file";
      if (doc.url) {
        const link = document.createElement("a");
        link.href = doc.url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = name;
        li.appendChild(link);
      } else {
        li.textContent = name;
      }
      list.appendChild(li);
    });
    container.appendChild(label);
    container.appendChild(list);
  } catch (error) {
    console.error("Failed to load policy files:", error);
    showToast("Unable to load files.", "error");
    container.textContent = "";
  }
};
