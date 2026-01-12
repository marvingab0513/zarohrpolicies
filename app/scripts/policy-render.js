import { loadPolicyData } from "./policy-data.js";

export const initPolicyRender = () => {
  const isPolicyPage = document.body?.dataset.page === "policies";
  if (!isPolicyPage) return;

  const container = document.querySelector("[data-policy-grid]");
  if (!container) return;

  const data = loadPolicyData();
  container.innerHTML = buildPolicyRail(data);
};

const buildPolicyRail = (modules) => {
  const moduleItems = modules
    .map((module) => {
      const policies = module.policies || [];
      return `
        <li class="policy-module-card reveal" data-module="${module.id}" data-link="#">
          <button class="rail-item" type="button">
            <span class="rail-title">${escapeHtml(module.name)}</span>
            <span class="rail-meta">${policies.length} ${policies.length === 1 ? "policy" : "policies"}</span>
          </button>
          <div class="flyout">
            <div class="module-top">
              <h2>${escapeHtml(module.name)}</h2>
              <p>${escapeHtml(module.description)}</p>
            </div>
            <ul class="module-list">
              ${policies
                .map(
                  (policy) =>
                    `<li class="policy-item" data-policy-id="${policy.id}"><span>${escapeHtml(
                      policy.name
                    )}</span></li>`
                )
                .join("")}
            </ul>
          </div>
        </li>
      `;
    })
    .join("");

  return `
    <aside class="policy-rail">
      <div class="rail-header">
        <span class="rail-label">Policy Modules</span>
        <span class="rail-count">${modules.length}</span>
      </div>
      <ul class="rail-list">
        ${moduleItems}
      </ul>
    </aside>
  `;
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
