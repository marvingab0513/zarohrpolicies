export const initChatbot = () => {
  const chatbot = document.querySelector("[data-chatbot]");
  if (!chatbot) return;

  const toggle = chatbot.querySelector(".chatbot-toggle");
  const panel = chatbot.querySelector(".chatbot-panel");
  const close = chatbot.querySelector(".chatbot-close");
  const form = chatbot.querySelector(".chatbot-form");
  const input = chatbot.querySelector(".chatbot-input");
  const messages = chatbot.querySelector(".chatbot-messages");

  const setOpen = (isOpen) => {
    chatbot.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      input?.focus();
    }
  };

  toggle?.addEventListener("click", () => {
    const next = !chatbot.classList.contains("is-open");
    setOpen(next);
  });

  close?.addEventListener("click", () => setOpen(false));

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-chatbot]")) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!input || !messages) return;
    const text = input.value.trim();
    if (!text) return;
    appendMessage(messages, text, "user");
    input.value = "";
    const pending = appendMessage(messages, "Thinking...", "bot");
    messages.scrollTop = messages.scrollHeight;
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ question: text }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Unable to answer right now.");
        }
        return response.json();
      })
      .then((data) => {
        pending.textContent = data?.answer || "I don't have enough information to answer that.";
      })
      .catch((error) => {
        pending.textContent = error?.message || "Unable to answer right now.";
      })
      .finally(() => {
        messages.scrollTop = messages.scrollHeight;
      });
  });
};

const appendMessage = (container, text, variant) => {
  const row = document.createElement("div");
  row.className = `chatbot-message-row ${variant}`;
  if (variant === "bot") {
    const avatar = document.createElement("div");
    avatar.className = "chatbot-avatar";
    avatar.setAttribute("aria-hidden", "true");
    const face = document.createElement("span");
    face.className = "bot-face";
    avatar.appendChild(face);
    row.appendChild(avatar);
  }
  const message = document.createElement("div");
  message.className = `chatbot-message ${variant}`;
  message.textContent = text;
  row.appendChild(message);
  container.appendChild(row);
  return message;
};
