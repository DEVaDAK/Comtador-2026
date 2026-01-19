const startDate = new Date("2026-01-01T00:00:00");
const endDate   = new Date("2026-12-31T23:59:59");
const today     = new Date();

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

const grid = document.getElementById("grid");
grid.innerHTML = "";

for (let i = 0; i < totalDays; i++) {
  const dot = document.createElement("div");
  dot.className = "dot";
  if (i < passedDays) dot.classList.add("filled");
  grid.appendChild(dot);
}
