import { listPolicyDocuments } from "../lib/policy-upload.js";

export const initModules = () => {
  const moduleCards = document.querySelectorAll(".module-card");
  moduleCards.forEach((card, index) => {
    card.style.setProperty("--delay", `${index * 120}ms`);
  });

  const isPolicyPage = document.body?.dataset.page === "policies";
  if (!isPolicyPage) return;

  const policyCards = Array.from(document.querySelectorAll(".policy-tile"));

  policyCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest(".module-list")) return;
      const link = card.dataset.link;
      if (link && link !== "#") {
        window.location.href = link;
      }
    });
  });

  const policyRail = document.querySelector(".policy-rail");
  if (policyRail) {
    policyRail.addEventListener("selectstart", (event) => event.preventDefault());
    policyRail.addEventListener("dblclick", (event) => event.preventDefault());
    policyRail.addEventListener("mousedown", (event) => {
      if (event.detail > 1) event.preventDefault();
    });
  }

  const policyItems = Array.from(document.querySelectorAll(".policy-item"));
  policyItems.forEach((item) => {
    item.addEventListener("dblclick", async (event) => {
      event.stopPropagation();
      const policyId = item.dataset.policyId;
      if (!policyId) return;
      await previewLatestDocument({ policyId });
    });
  });
};

const previewLatestDocument = async ({ policyId }) => {
  try {
    const files = await listPolicyDocuments({ policyId });
    if (!files.length) {
      showToast("No files uploaded for this policy.", "info");
      return;
    }
    const latest = files[0];
    const name = latest.file_path ? latest.file_path.split("/").pop() : "Document preview";
    openDocumentViewer({ url: latest.url, name });
  } catch (error) {
    console.error("Preview failed:", error);
    showToast("Unable to open document preview.", "error");
  }
};

const openDocumentViewer = ({ url, name }) => {
  if (!url) {
    showToast("Preview not available for this file.", "error");
    return;
  }
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
  const download = modal.querySelector("[data-viewer-download]");

  title.textContent = name || "Document preview";
  fallback.textContent = "";
  frame.style.opacity = "1";
  frame.src = viewerUrl;
  if (download) {
    download.href = url;
    download.setAttribute("download", name || "document");
  }
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
        <div class="viewer-fallback"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => {
    const frame = modal.querySelector(".viewer-frame");
    frame.src = "";
    frame.style.opacity = "1";
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
