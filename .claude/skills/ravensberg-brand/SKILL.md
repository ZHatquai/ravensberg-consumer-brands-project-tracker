---
name: ravensberg-brand
description: Apply Ravensberg Consumer Brands' identity to any UI, dashboard, document, spreadsheet, presentation or written output produced for Ravensberg. Trigger whenever styling a dashboard, building a deck or workbook, drafting an email or report, or producing any branded output for Ravensberg, the mock company in SustainOS Cowork use cases. Read this file before writing a single line of code or copy for Ravensberg.
---

# Ravensberg Consumer Brands — brand skill

## Files

This package: `SKILL.md`, `assets/` (logo, mark, favicon) and `templates/` (UI tokens, Excel tokens, deck template), installed in a project at `.claude/skills/ravensberg-brand/`. Read the files from this folder. Master copy (outside the repo): `Documents\SustainOS\4-assets\mock-companies\ravensberg-consumer-brands\brand\`. Never redraw the mark from shapes.

## Identity

Ravensberg Consumer Brands GmbH, Bielefeld. A family-owned consumer goods group with six business units (Beverages, Confectionery, Food ingredients, Home and personal care, Packaging, Homeware) and seven sites in Germany.

Purpose: "We make everyday life a little better with trusted products, produced responsibly, for people and the planet."
Tagline: "Everyday goodness for a brighter tomorrow." Short form: "Trusted brands. A more sustainable everyday."
Three pillars: For people. For a healthier planet. For everyday life.

This is a fictional company used for training. Company facts live in `company-profile.md` in the SustainOS mock-company folder, not in this package; this skill only carries the look and voice.

## Colors

| Role | Name | Hex | Usage |
|---|---|---|---|
| Primary | Ravensberg Green | `#0F6B3A` | Logo, headings, major backgrounds, table headers, primary chart series |
| Secondary | Leaf Green | `#7FB069` | Sustainability accents, underline rules, eyebrows, third chart series |
| Warm accent | Warm Taupe | `#C9A27F` | Highlights, prior-period chart series, tagline on green |
| Light background | Soft Stone | `#F5F4EF` | Page and slide background, zebra rows |
| Text | Charcoal | `#333333` | Body text, "CONSUMER BRANDS" in the logo |
| Neutral | White | `#FFFFFF` | Reversed logo, text on green, cards on Soft Stone |

Derived neutrals for interface work only (not brand colours): mid grey `#6B6B6B` for captions and axis labels, line grey `#DDDBD3` for borders, gridlines and table rules.

### Semantic colours for data status (functional addition)

Reporting readiness and any good / attention / problem state use this set, never the brand greens. The brand green is structure; it must never be read as "good".

| State | Hex | Use |
|---|---|---|
| OK | `#2E8B57` | Passed first time, on target, improvement |
| Attention | `#D98E2B` | Corrected after follow-up, accepted estimate, flat |
| Problem | `#C0392B` | Missing, open finding, deterioration |

Shown as a dot, a pill or a thin stripe. Never as a fill for a whole chart bar.

### Chart series order

1. Current period: Ravensberg Green `#0F6B3A`
2. Prior period or comparative: Warm Taupe `#C9A27F`
3. Third series: Leaf Green `#7FB069`
4. Fourth series: Charcoal `#333333` at 60% opacity

Gridlines line grey, no chart border, legend at the bottom, factor set named in the series label when emissions are shown. Estimated values are hatched or outlined, and say "estimate" in the label.

## Typography

| Use case | Font | Weight |
|---|---|---|
| Headlines, titles, slide titles, KPI numbers, logo wordmark | Montserrat | SemiBold 600 or Bold 700 |
| Subheads | Montserrat | Medium 500 |
| Body text, table body, captions, axis labels, email and report copy | Source Sans 3 | Regular 400 |
| Eyebrows, small labels, "CONSUMER BRANDS" | Source Sans 3 | SemiBold 600, uppercase, letter-spaced |

Both are on Google Fonts. Fallback stacks: `Montserrat, "Segoe UI", Arial, sans-serif` and `"Source Sans 3", "Segoe UI", Arial, sans-serif`. Never introduce a third typeface.

## Logo and assets

All in `assets/`. Use the file; never redraw the mark from shapes, recolour it off-palette, stretch it or add effects.

| File | Use |
|---|---|
| `ravensberg-logo.svg` / `.png` | Primary lockup, mark + wordmark, for Soft Stone or white backgrounds |
| `ravensberg-logo-white.svg` / `.png` | Reversed lockup, all white, for Ravensberg Green backgrounds only |
| `ravensberg-mark.svg` / `.png` | Mark alone (three leaves: Leaf Green left, Ravensberg Green centre, Warm Taupe right), for icons, footers, small spaces |
| `ravensberg-mark-white.svg` / `.png` | Reversed mark on a green rounded tile, for closing slides and app icons |
| `favicon.png` | 64 px favicon from the mark |

Rules: clear space around the lockup at least the height of the "R"; minimum width 25 mm in print, 100 px on screen; the mark alone is fine below that.

## Voice and tone

Down-to-earth, positive, trustworthy, human, forward-looking. Plain language, short sentences, concrete numbers. Internal documents say what was found and what was done; they do not sell. Estimates are called estimates. A rating letter always comes with its component scores.

## Always / Never

Always
- Soft Stone or white pages; Ravensberg Green only for title and closing slides, headers, table header rows.
- One accent per element. Leaf Green for rules and eyebrows, Warm Taupe for the comparative series and the tagline.
- Name the emission factor set on every output that shows CO2e.
- Show reporting readiness as a semantic dot next to the rating, never inside the score.
- Footer on every content slide: "Ravensberg Consumer Brands | Group Sustainability | Internal" and a page number.

Never
- Brand green as a "good" signal, or Warm Taupe as a "warning".
- Gradients, shadows on every card, stock photos, leaves or globes as decoration (the mark is the only leaf).
- Both greens as adjacent chart series for different sites; sites are distinguished by position, not colour.
- A second typeface, or Montserrat for body text.

## Templates included in this package

- Presentation reference deck — `templates/ravensberg-deck-template.pptx`. Seven slides, one per layout: Title, Section, Content, KPI tiles with factor-effect panel, Chart, Table with readiness dots, Closing. Each slide's notes say how to use the layout. Copy the deck and replace content; do not restyle.
- UI colour and type tokens — `templates/tokens.css`. CSS custom properties for dashboards and HTML artifacts, light theme only (the review is presented on a light screen).
- Excel styling — `templates/excel-tokens.md`. Header fill, fonts, number formats, zebra rows, readiness cell formatting, one tab per site convention.

## How this feeds your build

Dashboards and HTML artifacts read `templates/tokens.css` and the logo from `assets/`. Presentations start from `templates/ravensberg-deck-template.pptx` and keep its layouts, fonts and footer. Workbooks follow `templates/excel-tokens.md` for every sheet. Emails and reports use the voice rules and the Source Sans 3 body style. Whatever the output, the factor set is named, estimates are flagged, and readiness is a dot from the semantic set beside the rating.
