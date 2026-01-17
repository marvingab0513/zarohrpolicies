import { loadPolicyData } from "./policy-data.js";

export const initPolicyRender = () => {
  const isPolicyPage = document.body?.dataset.page === "policies";
  if (!isPolicyPage) return;

  const container = document.querySelector("[data-policy-grid]");
  if (!container) return;

  const data = loadPolicyData();
  container.innerHTML = buildPolicyRail(data);
  updatePolicyTotal(data);
};

const buildPolicyRail = (modules) => {
  const moduleItems = modules
    .map((module) => {
      const policies = module.policies || [];
      let icon = "";
      if (module.name === "Doing the Right Thing") {
        icon = `/Images/ChatGPT Image Jan 13, 2026, 03_46_37 PM.png`;
      } else if (module.name === "Health, Care & Safety") {
        icon = `/Images/ChatGPT Image Jan 13, 2026, 03_32_07 PM.png`;
      } else if (module.name === "Learning & Performance") {
        icon = `/Images/ChatGPT Image Jan 13, 2026, 03_56_51 PM.png`;
      } else if (module.name === "Life at Work") {
        icon = `/Images/ChatGPT Image Jan 13, 2026, 04_52_55 PM.png`;
      } else if (module.name === "Pay, Perks & Security") {
        icon = `/Images/ChatGPT Image Jan 13, 2026, 05_05_11 PM.png`;
      } else if (module.name === "Time Away") {
        icon = `/Images/ChatGPT Image Jan 13, 2026, 05_12_06 PM.png`;
      } else if (module.name === "Tools & Allowance") {
        icon = `/Images/ChatGPT Image Jan 13, 2026, 05_23_38 PM.png`;
      }
      return `
        <li class="policy-module-card reveal" data-module="${module.id}" data-link="#">
          <button class="rail-item" type="button">
            <span class="rail-title">
              ${escapeHtml(module.name)}
              <span class="rail-meta">${policies.length} ${policies.length === 1 ? "policy" : "policies"}</span>
            </span>
            ${icon ? `<img class="rail-icon" src="${icon}" alt="" aria-hidden="true" />` : ""}
            <span class="rail-desc">${escapeHtml(module.description)}</span>
          </button>
          <div class="flyout">
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
      <ul class="rail-list">
        ${moduleItems}
      </ul>
    </aside>
  `;
};

const updatePolicyTotal = (modules) => {
  const total = modules.reduce((sum, module) => sum + (module.policies?.length || 0), 0);
  const label = document.querySelector("[data-policy-total]");
  if (label) {
    const moduleCount = modules.length;
    label.textContent = `${moduleCount} ${moduleCount === 1 ? "module" : "modules"} · ${total} ${
      total === 1 ? "policy" : "policies"
    }`;
  }
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
