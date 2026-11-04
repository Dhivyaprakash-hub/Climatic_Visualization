const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fields = ["Annual", ...months];
const state = { rows: [], focus: "India", compareA: "India", compareB: "Canada", query: "", order: "desc" };
const root = document.querySelector("#explore");

function parseCsv(source) {
  const lines = source.trim().split(/\r?\n/);
  const headers = parseRow(lines.shift());
  if (headers.length !== 14 || headers[0] !== "Country" || headers[1] !== "Annual") {
    throw new Error("The CSV must include Country, Annual, and twelve monthly fields.");
  }
  const rows = lines.map((line, index) => {
    const values = parseRow(line);
    if (values.length !== headers.length) throw new Error(`Row ${index + 2} has ${values.length} values; expected ${headers.length}.`);
    const row = { country: values[0] };
    headers.slice(1).forEach((header, column) => {
      const value = Number(values[column + 1]);
      if (!Number.isFinite(value)) throw new Error(`Invalid numeric value for ${row.country}, ${header}.`);
      row[header] = value;
    });
    return row;
  });
  if (!rows.length) throw new Error("The CSV does not contain any country rows.");
  return rows;
}

function parseRow(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const character = line[i];
    if (character === '"' && line[i + 1] === '"' && quoted) { cell += '"'; i += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { cells.push(cell.trim()); cell = ""; }
    else cell += character;
  }
  cells.push(cell.trim());
  return cells;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function fmt(value) { return `${value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}°`; }
function byCountry(name) { return state.rows.find((row) => row.country === name) || state.rows[0]; }
function getRange() {
  const values = state.rows.flatMap((row) => fields.map((field) => row[field]));
  return { min: Math.min(...values), max: Math.max(...values) };
}
function getAnnualRange() {
  const values = state.rows.map((row) => row.Annual);
  return { min: Math.min(...values), max: Math.max(...values) };
}
function colorFor(value) {
  const { min, max } = getRange();
  const ratio = (value - min) / (max - min || 1);
  const hue = 202 - ratio * 170;
  const light = 38 + ratio * 9;
  return `hsl(${hue} 47% ${light}%)`;
}

function fillSelectors() {
  const names = state.rows.map((row) => row.country);
  document.querySelector("#focus-country").innerHTML = optionList(names, state.focus);
  document.querySelector("#compare-a").innerHTML = optionList(names, state.compareA);
  document.querySelector("#compare-b").innerHTML = optionList(names, state.compareB);
}

function optionList(names, selected) {
  return names.map((name) => `<option value="${escapeHtml(name)}" ${name === selected ? "selected" : ""}>${escapeHtml(name)}</option>`).join("");
}

function renderMetrics() {
  const sorted = [...state.rows].sort((a, b) => a.Annual - b.Annual);
  document.querySelector("#country-count").textContent = String(state.rows.length).padStart(2, "0");
  document.querySelector("#warmest-value").textContent = fmt(sorted.at(-1).Annual);
  document.querySelector("#warmest-name").textContent = sorted.at(-1).country;
  document.querySelector("#coldest-value").textContent = fmt(sorted[0].Annual);
  document.querySelector("#coldest-name").textContent = sorted[0].country;
  document.querySelector("#observation-count").textContent = String(state.rows.length * 12);
}

function renderHeatmap() {
  const focus = byCountry(state.focus);
  const rows = [...state.rows].sort((a, b) => a.country.localeCompare(b.country));
  const monthHead = months.map((month) => `<span class="month-head">${month}</span>`).join("");
  const countryRows = rows.map((row) => `<div class="heat-row ${row.country === focus.country ? "focused" : ""}" role="row"><button class="country-cell" type="button" role="rowheader" data-focus="${escapeHtml(row.country)}" aria-label="Focus ${escapeHtml(row.country)}">${escapeHtml(row.country)}</button>${months.map((month) => `<button class="heat-cell" type="button" role="gridcell" data-focus="${escapeHtml(row.country)}" data-month="${month}" style="--cell-color:${colorFor(row[month])}" aria-label="${escapeHtml(row.country)}, ${month}: ${row[month].toFixed(2)} degrees Celsius" title="${escapeHtml(row.country)} · ${month} · ${row[month].toFixed(1)} °C"><span>${row[month].toFixed(0)}</span></button>`).join("")}</div>`).join("");
  document.querySelector("#heatmap").innerHTML = `<div class="heat-grid" role="grid" aria-label="Monthly mean temperature by country"><div class="heat-head" role="row"><span class="country-head">COUNTRY</span>${monthHead}</div>${countryRows}</div>`;
  document.querySelectorAll("[data-focus]").forEach((button) => button.addEventListener("click", () => {
    state.focus = button.dataset.focus;
    document.querySelector("#focus-country").value = state.focus;
    renderHeatmap();
    renderAnnual();
    renderTable();
  }));
}

function renderAnnual() {
  const direction = state.order === "asc" ? 1 : -1;
  const rows = [...state.rows].sort((a, b) => (a.Annual - b.Annual) * direction);
  const { min, max } = getAnnualRange();
  document.querySelector("#annual-chart").innerHTML = rows.map((row) => {
    const width = Math.max(1, ((row.Annual - min) / (max - min)) * 100);
    return `<button class="annual-row ${row.country === state.focus ? "focused" : ""}" type="button" role="listitem" data-country="${escapeHtml(row.country)}" aria-label="Focus ${escapeHtml(row.country)}, annual mean ${row.Annual.toFixed(2)} degrees Celsius"><span class="annual-name">${escapeHtml(row.country)}</span><span class="bar-track"><i style="width:${width}%;background:${colorFor(row.Annual)}"></i></span><b>${row.Annual.toFixed(1)}°</b></button>`;
  }).join("");
  document.querySelectorAll(".annual-row").forEach((button) => button.addEventListener("click", () => {
    state.focus = button.dataset.country;
    document.querySelector("#focus-country").value = state.focus;
    renderHeatmap();
    renderAnnual();
    renderTable();
  }));
}

function renderLineChart() {
  const first = byCountry(state.compareA);
  const second = byCountry(state.compareB);
  const values = [...months.map((month) => first[month]), ...months.map((month) => second[month])];
  const min = Math.floor(Math.min(...values) / 5) * 5;
  const max = Math.ceil(Math.max(...values) / 5) * 5;
  const w = 840, h = 268, left = 42, right = 22, top = 20, bottom = 40;
  const chartW = w - left - right, chartH = h - top - bottom;
  const y = (value) => top + ((max - value) / (max - min || 1)) * chartH;
  const x = (index) => left + (index / (months.length - 1)) * chartW;
  const yTicks = Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4);
  const grid = yTicks.map((tick) => `<g><line x1="${left}" y1="${y(tick)}" x2="${w - right}" y2="${y(tick)}" stroke="#e8eeeb"/><text x="${left - 9}" y="${y(tick) + 3}" text-anchor="end" fill="#87968e" font-size="9">${tick.toFixed(0)}°</text></g>`).join("");
  const xLabels = months.map((month, index) => `<text x="${x(index)}" y="${h - 13}" text-anchor="middle" fill="#829189" font-size="9">${month}</text>`).join("");
  const makeSeries = (row, stroke, key) => {
    const points = months.map((month, index) => `${x(index)},${y(row[month])}`).join(" ");
    const circles = months.map((month, index) => `<circle cx="${x(index)}" cy="${y(row[month])}" r="3" fill="${stroke}" stroke="#fff" stroke-width="1.5"><title>${escapeHtml(row.country)} · ${month}: ${row[month].toFixed(2)} °C</title></circle>`).join("");
    return `<g data-series="${key}"><polyline points="${points}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${circles}</g>`;
  };
  document.querySelector("#line-chart").innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Monthly mean temperature: ${escapeHtml(first.country)} compared with ${escapeHtml(second.country)}"><title>Monthly temperature comparison</title>${grid}${xLabels}${makeSeries(first, "#438b7b", "a")}${makeSeries(second, "#d98d55", "b")}</svg>`;
  document.querySelector("#line-legend").innerHTML = `<span><i class="legend-dot dot-a"></i>${escapeHtml(first.country)}</span><span><i class="legend-dot dot-b"></i>${escapeHtml(second.country)}</span>`;
}

function sparkline(row) {
  const values = months.map((month) => row[month]);
  const min = Math.min(...values), max = Math.max(...values);
  const points = values.map((value, index) => `${(index / 11) * 70},${19 - ((value - min) / (max - min || 1)) * 15}`).join(" ");
  return `<svg class="sparkline" viewBox="0 0 70 22" aria-label="Seasonal profile, ${escapeHtml(row.country)}"><polyline points="${points}" fill="none" stroke="#548c7e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function renderTable() {
  const query = state.query.trim().toLowerCase();
  const rows = [...state.rows].filter((row) => row.country.toLowerCase().includes(query)).sort((a, b) => a.country.localeCompare(b.country));
  const monthColumns = ["Jan", "Apr", "Jul", "Oct"];
  document.querySelector("#country-table").innerHTML = rows.map((row) => `<tr class="${row.country === state.focus ? "focused" : ""}"><th scope="row"><button type="button" data-table-country="${escapeHtml(row.country)}">${escapeHtml(row.country)}</button></th><td><strong>${row.Annual.toFixed(2)}</strong></td>${monthColumns.map((month) => `<td>${row[month].toFixed(2)}</td>`).join("")}<td>${sparkline(row)}</td></tr>`).join("") || `<tr><td colspan="7" class="no-results">No country matches that search.</td></tr>`;
  document.querySelectorAll("[data-table-country]").forEach((button) => button.addEventListener("click", () => {
    state.focus = button.dataset.tableCountry;
    document.querySelector("#focus-country").value = state.focus;
    renderHeatmap();
    renderAnnual();
    renderTable();
  }));
}

function downloadCsv() {
  const header = ["Country", ...fields].join(",");
  const body = state.rows.map((row) => [row.country, ...fields.map((field) => row[field])].join(","));
  const blob = new Blob([[header, ...body].join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "temperature-coursework-snapshot.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function connectControls() {
  document.querySelector("#focus-country").addEventListener("change", (event) => { state.focus = event.target.value; renderHeatmap(); renderAnnual(); renderTable(); });
  document.querySelector("#compare-a").addEventListener("change", (event) => { state.compareA = event.target.value; if (state.compareA === state.compareB) { state.compareB = state.rows.find((row) => row.country !== state.compareA)?.country || state.compareA; document.querySelector("#compare-b").value = state.compareB; } renderLineChart(); });
  document.querySelector("#compare-b").addEventListener("change", (event) => { state.compareB = event.target.value; if (state.compareA === state.compareB) { state.compareA = state.rows.find((row) => row.country !== state.compareB)?.country || state.compareB; document.querySelector("#compare-a").value = state.compareA; } renderLineChart(); });
  document.querySelector("#annual-order").addEventListener("change", (event) => { state.order = event.target.value; renderAnnual(); });
  document.querySelector("#country-search").addEventListener("input", (event) => { state.query = event.target.value; renderTable(); });
  document.querySelector("#download-csv").addEventListener("click", downloadCsv);
}

async function init() {
  const heatmap = document.querySelector("#heatmap");
  heatmap.innerHTML = `<div class="load-state"><span class="loading-orb"></span><p>Loading the coursework data…</p></div>`;
  try {
    const response = await fetch("./Countries.csv", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Could not load the dataset (${response.status}).`);
    state.rows = parseCsv(await response.text());
    if (!state.rows.some((row) => row.country === state.focus)) state.focus = state.rows[0].country;
    if (!state.rows.some((row) => row.country === state.compareA)) state.compareA = state.rows[0].country;
    if (!state.rows.some((row) => row.country === state.compareB)) state.compareB = state.rows[Math.min(1, state.rows.length - 1)].country;
    fillSelectors();
    renderMetrics();
    renderHeatmap();
    renderAnnual();
    renderLineChart();
    renderTable();
    connectControls();
  } catch (error) {
    root.insertAdjacentHTML("afterbegin", `<div class="load-error" role="alert"><strong>The explorer could not load its data.</strong><p>${escapeHtml(error.message)}</p><button type="button" id="retry-load">Try again</button></div>`);
    document.querySelector("#retry-load").addEventListener("click", () => { document.querySelector(".load-error")?.remove(); init(); });
  }
}

init();
