(() => {
  const tables = [...document.querySelectorAll("table[data-sticky-header]")];
  if (!tables.length) return;
  const menu = document.getElementById("menu");
  let scheduled = false;

  // The horizontal overflow wrapper traps native sticky positioning. Move the
  // real header vertically so its column widths, scrolling, and sorting stay intact.
  function update() {
    scheduled = false;
    const top = menu.getBoundingClientRect().bottom;
    tables.forEach(table => {
      const header = table.tHead;
      const bounds = table.getBoundingClientRect();
      const limit = bounds.height - header.getBoundingClientRect().height;
      const offset = Math.max(0, Math.min(top - bounds.top, limit));
      header.style.setProperty("--table-header-offset", `${offset}px`);
    });
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("pageshow", scheduleUpdate);
  // Also follow font loading, column widths, and the expanded mobile menu.
  const observer = new ResizeObserver(scheduleUpdate);
  tables.forEach(table => observer.observe(table));
  observer.observe(menu);
  scheduleUpdate();
})();
