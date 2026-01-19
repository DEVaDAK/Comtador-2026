const startDate = new Date("2026-01-01");
const endDate = new Date("2026-12-31");
const today = new Date();

const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
const passedDays = Math.max(0, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)));
const daysLeft = totalDays - passedDays;

const percent = ((passedDays / totalDays) * 100).toFixed(2);

document.getElementById("percent").innerText = `${percent}%`;
document.getElementById("daysLeft").innerText = `${daysLeft} días restantes`;

const grid = document.getElementById("grid");

for (let i = 0; i < totalDays; i++) {
  const dot = document.createElement("div");
  dot.classList.add("dot");
  if (i < passedDays) dot.classList.add("filled");
  grid.appendChild(dot);
}
