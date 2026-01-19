function parseParams() {
  const p = new URLSearchParams(location.search);

  const year = p.get("year");
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
    startDate = new Date("2026-01-01T00:00:00");
    endDate   = new Date("2026-12-31T23:59:59");
    title = "2026 en días";
  }

  return { startDate, endDate, title };
}

function fmtDate(d) {
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

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function getMilestoneIndices(totalDays){
  // 0-based: 25%, 50%, 75%
  const q1 = clamp(Math.round(totalDays * 0.25) - 1, 0, totalDays - 1);
  const q2 = clamp(Math.round(totalDays * 0.50) - 1, 0, totalDays - 1);
  const q3 = clamp(Math.round(totalDays * 0.75) - 1, 0, totalDays - 1);
  return new Set([q1, q2, q3]);
}

function dayProgress01(now){
  const midnight = new Date(now);
  midnight.setHours(0,0,0,0);
  return clamp((now - midnight) / 86400000, 0, 1);
}

const tooltip = document.getElementById("tooltip");

function showTooltip(x, y, html) {
  tooltip.innerHTML = html;
  const pad = 14;

  const rect = tooltip.getBoundingClientRect();
  let left = x + pad;
  let top  = y + pad;

  if (left + rect.width > window.innerWidth - 6) left = x - rect.width - pad;
  if (top + rect.height > window.innerHeight - 6) top = y - rect.height - pad;

  tooltip.style.transform = `translate(${left}px, ${top}px)`;
}

function hideTooltip() {
  tooltip.style.transform = "translate(-9999px, -9999px)";
}

function render() {
  const { startDate, endDate, title } = parseParams();
  const now = new Date();

  document.getElementById("title").innerText = title;

  const totalDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24) + 1);

  const passedDays = Math.max(
    0,
    Math.floor((now - startDate) / (1000 * 60 * 60 * 24))
  );

  const daysLeft = Math.max(0, totalDays - passedDays);
  const percent = ((passedDays / totalDays) * 100).toFixed(2);

  document.getElementById("percent").innerText = `${percent}%`;
  document.getElementById("daysLeft").innerText = `${daysLeft} días restantes`;

  document.getElementById("rangePill").innerText = `Del ${fmtDate(startDate)} al ${fmtDate(endDate)}`;
  document.getElementById("dayOfYearPill").innerText = `Hoy: día #${dayOfYear(now)}`;
  document.getElementById("weeksPill").innerText = `${Math.ceil(daysLeft / 7)} semanas restantes`;

  const grid = document.getElementById("grid");
  grid.innerHTML = "";

  const milestones = getMilestoneIndices(totalDays);

  // Progreso del día para el dot actual (0..360deg)
  const pDay = dayProgress01(now);
  const deg = `${Math.round(pDay * 360)}deg`;

  for (let i = 0; i < totalDays; i++) {
    const dot = document.createElement("div");
    dot.className = "dot";

    const isFilled = i < passedDays;
    const isCurrent = (i === passedDays && passedDays < totalDays);
    const isMilestone = milestones.has(i);

    if (isMilestone) dot.classList.add("milestone");
    if (isFilled) dot.classList.add("filled");
    if (isCurrent) dot.classList.add("current");

    // ✅ relleno gradual durante el día en el dot actual
    if (isCurrent){
      dot.classList.add("todayProgress");
      dot.style.setProperty("--p", deg);
    }

    // Fecha del dot
    const dateForDot = new Date(startDate);
    dateForDot.setDate(startDate.getDate() + i);

    let extra = "";
    if (isMilestone) extra = " • HITO";

    const label = `
      <div><strong>${fmtDate(dateForDot)}</strong></div>
      <div class="muted">Día ${i + 1} de ${totalDays}${extra}</div>
    `;

    dot.addEventListener("mousemove", (e) => {
      showTooltip(e.clientX, e.clientY, label);
    });
    dot.addEventListener("mouseleave", hideTooltip);

    dot.addEventListener("click", (e) => {
      showTooltip(e.clientX || (window.innerWidth / 2), e.clientY || (window.innerHeight / 2), label);
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

  // Export IG (PNG 1080x1350) ✅ centrado
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) {
    exportBtn.onclick = async () => {
      try {
        exportBtn.disabled = true;
        exportBtn.textContent = "Generando...";

        const png = await buildIGImage({
          title,
          percent,
          daysLeft,
          startDate,
          endDate,
          totalDays,
          passedDays,
          milestones,
          dayProgress: pDay
        });

        const a = document.createElement("a");
        a.href = png;
        a.download = (title || "progreso").toLowerCase().replace(/\s+/g,"-") + "-ig.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        alert("No pude generar la imagen. Probá de nuevo.");
      } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = "Descargar imagen";
      }
    };
  }
}

/* ---------- Export PNG (centrado y prolijo) ---------- */

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

function getCssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function buildIGImage(state){
  const W = 1080, H = 1350;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const bg1 = getCssVar("--bg1") || "#07131d";
  const bg2 = getCssVar("--bg2") || "#0e1a24";
  const fill1 = getCssVar("--fill1") || "#5bbcff";
  const fill2 = getCssVar("--fill2") || "#2f7bff";
  const ms1 = getCssVar("--milestone1") || "#ffd36a";
  const ms2 = getCssVar("--milestone2") || "#d69824";

  // background
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, bg1);
  g.addColorStop(1, bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // glows
  const glowA = ctx.createRadialGradient(240,200,0, 240,200,560);
  glowA.addColorStop(0, "rgba(91,188,255,0.18)");
  glowA.addColorStop(1, "rgba(91,188,255,0)");
  ctx.fillStyle = glowA; ctx.fillRect(0,0,W,H);

  const glowB = ctx.createRadialGradient(860,120,0, 860,120,560);
  glowB.addColorStop(0, "rgba(47,123,255,0.14)");
  glowB.addColorStop(1, "rgba(47,123,255,0)");
  ctx.fillStyle = glowB; ctx.fillRect(0,0,W,H);

  // card
  const cardX = 70, cardY = 120, cardW = W - 140, cardH = H - 240;

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.stroke();

  // header
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.font = "900 70px Inter, system-ui, sans-serif";
  ctx.fillText(state.title, cardX + 60, cardY + 110);

  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.font = "700 30px Inter, system-ui, sans-serif";
  ctx.fillText(`Del ${fmtDate(state.startDate)} al ${fmtDate(state.endDate)}`, cardX + 60, cardY + 160);

  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.font = "900 44px Inter, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${state.percent}%`, cardX + cardW - 60, cardY + 122);
  ctx.textAlign = "left";

  // grid centered
  const cols = 20;
  const gap = 14;
  const dot = 20;
  const cell = dot + gap;
  const rows = Math.ceil(state.totalDays / cols);

  const neededW = cols * cell - gap;
  const neededH = rows * cell - gap;

  const maxW = cardW - 120;
  const maxH = cardH - 360;

  const scale = Math.min(1, maxW / neededW, maxH / neededH);

  const drawW = neededW * scale;
  const drawH = neededH * scale;

  const gridX = cardX + (cardW - drawW) / 2;
  const gridY = cardY + 210;

  ctx.save();
  ctx.translate(gridX, gridY);
  ctx.scale(scale, scale);

  for (let i=0;i<state.totalDays;i++){
    const r = Math.floor(i/cols);
    const c = i%cols;
    const x = c * cell;
    const y = r * cell;

    const isFilled = i < state.passedDays;
    const isCurrent = (i === state.passedDays && state.passedDays < state.totalDays);
    const isMilestone = state.milestones.has(i);

    // base
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.fillStyle = "rgba(0,0,0,0)";

    if (isMilestone){
      ctx.strokeStyle = "rgba(255,211,106,0.60)";
      ctx.fillStyle = "rgba(255,211,106,0.12)";
    }

    if (isFilled){
      const lg = ctx.createLinearGradient(x, y, x+dot, y+dot);
      if (isMilestone){ lg.addColorStop(0, ms1); lg.addColorStop(1, ms2); }
      else { lg.addColorStop(0, fill1); lg.addColorStop(1, fill2); }
      ctx.fillStyle = lg;
      ctx.strokeStyle = "rgba(255,255,255,0)";
    }

    // circle
    ctx.beginPath();
    ctx.arc(x + dot/2, y + dot/2, dot/2, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();

    // current: ring + partial progress
    if (isCurrent){
      // outer glow ring
      ctx.save();
      ctx.shadowColor = "rgba(91,188,255,0.55)";
      ctx.shadowBlur = 22;
      ctx.strokeStyle = "rgba(91,188,255,0.85)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + dot/2, y + dot/2, dot/2 + 2, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();

      // day progress arc
      const start = -Math.PI/2;
      const end = start + (Math.PI * 2 * state.dayProgress);
      ctx.strokeStyle = "rgba(91,188,255,0.95)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x + dot/2, y + dot/2, dot/2 - 1, start, end);
      ctx.stroke();
    }
  }

  ctx.restore();

  // footer
  ctx.fillStyle = "rgba(255,255,255,0.80)";
  ctx.font = "900 56px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${state.daysLeft} días restantes`, W/2, cardY + cardH - 80);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

/* ---------- Updates ---------- */
render();

/* ✅ Para que el “relleno del día” se vea vivo */
setInterval(render, 20000); // cada 20s

/* actualizar igual al cambio de día (por si queda abierto) */
function msUntilNextMidnight() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next - now;
}

setTimeout(() => {
  render();
}, msUntilNextMidnight());

window.addEventListener("scroll", hideTooltip, { passive: true });
document.addEventListener("touchstart", (e) => {
  if (!e.target.classList?.contains("dot")) hideTooltip();
}, { passive: true });
