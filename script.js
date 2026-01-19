function parseParams() {
  const p = new URLSearchParams(location.search);

  // year=2026
  const year = p.get("year");

  // from=YYYY-MM-DD & to=YYYY-MM-DD
  const from = p.get("from");
  const to = p.get("to");

  let startDate, endDate, title;

  if (from && to) {
    startDate = new Date(from + "T00:00:00");
    endDate   = new Date(to + "T23:59:59");
    title = "Cuenta atrás";
  } else if (year) {
    startDate = new Date(`${year}-01-01T00:00:00`);
    endDate   = new Date(`${year}-12-31T23:59:59`);
    title = `${year} en días`;
  } else {
    // default
    startDate = new Date("2026-01-01T00:00:00");
    endDate   = new Date("2026-12-31T23:59:59");
    title = "2026 en días";
  }

  return { startDate, endDate, title };
}

function fmtDate(d) {
  // dd/mm/yyyy
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

const tooltip = document.getElementById("tooltip");

function showTooltip(x, y, html) {
  tooltip.innerHTML = html;
  const pad = 14;

  // posicionar sin salirse
  const rect = tooltip.getBoundingClientRect();
  let left = x + pad;
  let top  = y + pad;

  // si se sale a la derecha, mover a la izquierda
  if (left + rect.width > window.innerWidth - 6) left = x - rect.width - pad;
  // si se sale abajo, mover arriba
  if (top + rect.height > window.innerHeight - 6) top = y - rect.height - pad;

  tooltip.style.transform = `translate(${left}px, ${top}px)`;
}

function hideTooltip() {
  tooltip.style.transform = "translate(-9999px, -9999px)";
}

function render() {
  const { startDate, endDate, title } = parseParams();
  const today = new Date();

  document.getElementById("title").innerText = title;

  const totalDays = Math.round(
    (endDate - startDate) / (1000 * 60 * 60 * 24) + 1
  );

  const passedDays = Math.max(
    0,
    Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
  );

  const daysLeft = Math.max(0, totalDays - passedDays);
  const percent = ((passedDays / totalDays) * 100).toFixed(2);

  document.getElementById("percent").innerText = `${percent}%`;
  document.getElementById("daysLeft").innerText = `${daysLeft} días restantes`;

  // Meta pills
  document.getElementById("rangePill").innerText = `Del ${fmtDate(startDate)} al ${fmtDate(endDate)}`;
  document.getElementById("dayOfYearPill").innerText = `Hoy: día #${dayOfYear(today)}`;
  document.getElementById("weeksPill").innerText = `${Math.ceil(daysLeft / 7)} semanas restantes`;

  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  for (let i = 0; i < totalDays; i++) {
    const dot = document.createElement("div");
    dot.className = "dot";

    if (i < passedDays) dot.classList.add("filled");
    if (i === passedDays && passedDays < totalDays) dot.classList.add("current");

    // Fecha del dot
    const dateForDot = new Date(startDate);
    dateForDot.setDate(startDate.getDate() + i);

    const label = `
      <div><strong>${fmtDate(dateForDot)}</strong></div>
      <div class="muted">Día ${i + 1} de ${totalDays}</div>
    `;

    // Tooltip en mouse
    dot.addEventListener("mousemove", (e) => {
      showTooltip(e.clientX, e.clientY, label);
    });
    dot.addEventListener("mouseleave", hideTooltip);

    // Tooltip en touch (tap)
    dot.addEventListener("click", (e) => {
      showTooltip(e.clientX || (window.innerWidth / 2), e.clientY || (window.innerHeight / 2), label);
      // ocultar luego de 1.8s
      setTimeout(hideTooltip, 1800);
    });

    grid.appendChild(dot);
  }

  // Share
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    shareBtn.onclick = async () => {
      const shareData = {
        title: title,
        text: `${title} — ${percent}% completado — ${daysLeft} días restantes`,
        url: location.href
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(location.href);
          alert("Link copiado al portapapeles ✅");
        }
      } catch (_) {}
    };
  }
}

// Render inicial
render();

// Actualizar a medianoche
function msUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next - now;
}

setTimeout(() => {
  render();
  setInterval(render, 24 * 60 * 60 * 1000);
}, msUntilNextMidnight());

// Ocultar tooltip al scrollear o tocar fuera
window.addEventListener("scroll", hideTooltip, { passive: true });
document.addEventListener("touchstart", (e) => {
  if (!e.target.classList?.contains("dot")) hideTooltip();
}, { passive: true });
