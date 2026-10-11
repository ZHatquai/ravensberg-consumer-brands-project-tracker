# Project approval presentation: requirements

**For:** Ravensberg Project Tracker, feature "approval presentation" (template download and mandatory upload)
**Date:** 11 October 2026
**Templates:** `ravensberg-project-approval-template-emissions.pptx`, `-water.pptx`, `-waste.pptx`

## 1. The rule

Every project submitted from the feature's go-live date carries an approval presentation. This covers new projects, resubmissions of declined projects and re-approvals. Projects registered before that date keep their status without one.

The presentation is built from the template of the project's category, saved as a PowerPoint file (.pptx) and attached to the submission. The ESG lead endorses from it, and the committee decides from it.

## 2. What every presentation contains

Twelve slides in the template, eleven in the submission (the instruction slide is deleted). The order is fixed.

| # | Slide | What it must show | Tracker field it must match |
|---|-------|-------------------|-----------------------------|
| 1 | Title | Project title, site, owner, project ID or "new", version, date | title, site, owner_name, version |
| 2 | How to prepare (instructions) | Deleted before submission | none |
| 3 | Decision summary | The ask in one line; annual impact, share of the site target, capex, payback; what, why now, what if not; for a resubmission, what changed | annual_impact, start_year, capex_eur, opex_eur_per_year |
| 4 | Baseline and problem | Base year, latest actual, 2030 requirement, covered by approved projects, gap; the source this project addresses | reference figures, Overview |
| 5 | Solution and options | What changes, where it is proven, what is out of scope; do nothing and up to two alternatives with impact and capex | description |
| 6 | Impact calculation | Before, after and change for every line, with sources and assumptions; annual impact and total impact | annual_impact, total_impact |
| 7 | Contribution to the 2030 target | Requirement, approved projects, this project, remaining gap, as chart and figures | calculated on the Overview |
| 8 | Financial case | Capex breakdown, funding, net capex, opex change with its parts; payback, NPV, cost per unit of impact; budget status; site controller's review | capex_eur, opex_eur_per_year |
| 9 | Implementation plan | Decision, engineering, procurement, installation, full run rate; team, production impact, permits and dependencies | start_year, owner_name |
| 10 | Risks and side effects | Up to four risks with level, effect, mitigation and owner; effects on the other two targets | none |
| 11 | Measurement and verification | What is measured, data source, baseline, frequency, person; first review date; what happens if the impact is below plan | none |
| 12 | Decision requested | The decision in up to three lines; prepared by, financials reviewed by, released by | title, capex_eur, start_year |

## 3. What differs by category

| Topic | Emissions | Water | Waste |
|-------|-----------|-------|-------|
| Unit of impact | tCO₂e per year | m³ per year | tonnes diverted per year |
| Boundary | Scope 1 + 2, location-based, FY2024 factor set (frozen). A green electricity contract does not count. | Withdrawal avoided at the site's meters. Water in a loop is counted once. | Tonnes moved away from landfill. Recycling, reuse and energy recovery count as diverted. |
| Target shown | 42 % of the site's FY2024 Scope 1 + 2 | Absolute (10 % of FY2024 withdrawal) and intensity (80 % of FY2024 m³ per tonne) | 95 % diversion at the site; no group percentage |
| Calculation lines | Gas, electricity, other fuel in MWh; Scope 1; Scope 2; net figure | Process demand, reuse, withdrawal by source, wastewater | Stream generated, landfill, recycling, energy recovery, prevented at source |
| Opex parts | Energy cost, CO₂ cost on fuels, maintenance | Water and wastewater fees, energy and chemicals for treatment, maintenance | Disposal cost avoided, revenue from recyclables, transport and containers |
| Cost metric | EUR per tCO₂e | EUR per m³ saved | EUR per tonne diverted |
| Typical side effects | Water use, waste, refrigerants | Energy for treatment, sludge, product quality and hygiene | Transport emissions, storage space, fire load |
| Evidence after start | Sub-meters for gas and electricity, output | Main meter, sub-meter, output | Weighbridge, contractor statements, rejects |

## 4. Completeness check before endorsement

The ESG lead endorses a project only when all of these hold:

1. Title, annual impact, total impact, start year, capex, opex and owner in the presentation are identical to the tracker form.
2. No bracket placeholder is left, and the instruction slide is deleted.
3. The calculation shows before, after and source for every line; every estimate is labelled "estimate".
4. The financial slide names the site controller who reviewed it.
5. The closing slide names who prepared and who released the presentation.
6. The file is one PowerPoint file named `[site code]_[short title]_v[version].pptx`.

## 5. Values the group still has to set

The templates leave these as placeholders because the tracker holds no group value for them today:

- the discount rate and period for the NPV (Group Finance)
- the CO₂ price assumed for fuels
- the emission factors of the FY2024 factor set (the tracker names the factor set but does not list the factors)
- a payback threshold, if the committee wants one

## 6. What the feature changes in the tool

Notes for the next spec iteration (the spec is at v1.2; this is a spec change, so the Tool Architect, the Access Architect and the Project Governor run before Claude Code builds it).

- **Template download:** three static files, for example in `public/templates/`, linked from the New project form by category. No database change.
- **Upload:** spec section 5 says "File storage: No" and section 12 lists file uploads as out of scope. The feature needs a private storage bucket, a reference to the file on the project version, and bucket rules in the access matrix that follow the project (a site user reads and writes only their own site's files while the project is Potential; the ESG lead and the CFO read all).
- **Mandatory:** the form refuses a submission without a file; a resubmission and a re-approval need a new file for the new version. The file of an approved or declined version is frozen with its row.
- **File type:** PowerPoint only (.pptx, MIME type `application/vnd.openxmlformats-officedocument.presentationml.presentation`), with a size limit on the bucket. A browser does not preview .pptx, so the project page offers the file as a download.
- **Existing projects:** the 37 demo projects have no file; the rule applies from the go-live date, so the check keys on the submission date.
- **Review pack:** the review pack could list, per committee decision, whether a presentation was attached.
