export const initReveal = () => {
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    reveals.forEach((element) => {
      const delay = Number(element.dataset.delay || 0);
      if (delay) {
        element.style.setProperty("--delay", `${delay}ms`);
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        });
      },
      { threshold: 0.2 }
    );

    reveals.forEach((element) => observer.observe(element));
  }

  const heroLines = document.querySelectorAll(".hero-title .line");
  if (heroLines.length) {
    heroLines.forEach((line, index) => {
      setTimeout(() => {
        line.style.opacity = "1";
        line.style.transform = "translateY(0)";
        line.style.transition = "opacity 600ms ease, transform 600ms ease";
      }, 140 * index);
    });
  }

  const counters = document.querySelectorAll(".metric-number");
  const animateCounter = (element) => {
    const target = Number(element.dataset.count || 0);
    const duration = 1200;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        const label = element.nextElementSibling;
        if (label) {
          label.classList.add("is-visible");
        }
      }
    };

    requestAnimationFrame(tick);
  };

  if (counters.length) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            const card = entry.target.closest(".metric");
            if (card) {
              card.classList.add("pulse-once");
            }
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );

    counters.forEach((counter) => counterObserver.observe(counter));
  }
};
