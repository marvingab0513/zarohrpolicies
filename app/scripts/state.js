export const initState = () => {
  const smoothScrollButtons = document.querySelectorAll("[data-scroll]");
  if (smoothScrollButtons.length) {
    smoothScrollButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const target = document.getElementById(button.dataset.scroll);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }
};
