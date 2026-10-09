# Excel styling — Ravensberg workbooks

| Element | Setting |
|---|---|
| Fonts | Header rows Montserrat 11 bold white; body Source Sans 3 10 (fall back to Calibri if not installed on the reader's machine, never change the header colour) |
| Header row fill | Ravensberg Green `#0F6B3A`, white text, wrap, height 32 |
| Zebra rows | Even rows Soft Stone `#F5F4EF`, odd rows white |
| Borders | Thin bottom border line grey `#DDDBD3` only; no vertical lines |
| Number formats | kWh, m³, litres: `#,##0`; tonnes: `#,##0.0`; hazardous tonnes: `#,##0.00`; percentages: `0.0%`; CO2e tonnes: `#,##0.0` |
| Totals row | Bold, top border Ravensberg Green medium, fill white |
| Estimated cells | Fill `#FBEBD2`, italic, cell comment "estimate: <source>" |
| Corrected cells | Fill `#E8F1EA`, cell comment "corrected: <old value> to <new value>, source <reply>, <date>" |
| Readiness column | Text OK / Attention / Problem with fill `#2E8B57` / `#D98E2B` / `#C0392B` and white text |
| Rating letter | Montserrat bold, Ravensberg Green |
| Freeze panes | Below header row, right of site column |
| Sheet order | `Summary` (group totals, ratings, factor set, readiness), one sheet per site `1000 Bielefeld` ... `1600 Lippstadt`, `Correction log`, `Factors` |
| Every sheet | Row 1: "Ravensberg Consumer Brands | Group Environmental Data | <round> | factor set <year> vN" in Montserrat 12 green; data starts row 3 |
| Column widths | Site 30, month 12, numbers 14, comments 40 |
| Logo | Not embedded in cells; the workbook is a working file |
