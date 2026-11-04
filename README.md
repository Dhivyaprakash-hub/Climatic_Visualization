# Climate Atlas

A responsive data exploration dashboard built around the temperature snapshot in this coursework repository. The original group report describes a 1991–2020 annual/monthly mean temperature period and references the [World Bank Climate Change Knowledge Portal](https://climateknowledgeportal.worldbank.org/).

## Explore

- View a monthly temperature heatmap for the 20 countries in the supplied CSV.
- Focus a country from the heatmap, annual ranking, or data table.
- Compare two monthly profiles on a shared chart.
- Search country rows and download the supplied values as CSV.
- Use the dashboard on desktop and mobile, with keyboard-accessible selectors and controls.

## Data limitations

The repository includes the group report and a CSV, but it does not preserve the exact indicator series, source export, extraction date, or calculation steps. The dashboard presents the supplied figures as an educational snapshot and does not claim that the values are current, complete, or independently verified. Use the World Bank portal directly for documented data needed for research or policy.

## Run locally

The dashboard uses semantic HTML, CSS, and native JavaScript modules with no runtime dependencies. Serve the repository root with any static web server; for example:

```bash
python -m http.server 4173
```

Open `http://localhost:4173`. The CSV is loaded with `fetch`, so opening `index.html` directly as a `file://` URL is not supported.

## Deploy

This is a static site. It can be hosted on GitHub Pages, Cloudflare Pages, or another static CDN at no application-server cost.
