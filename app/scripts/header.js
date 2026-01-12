export const initHeader = () => {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const onScroll = () => {
    const scrolled = window.scrollY > 20;
    header.classList.toggle("scrolled", scrolled);
    const progress = Math.min(window.scrollY / 160, 1);
    header.style.setProperty("--scroll-progress", progress.toString());
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
};
