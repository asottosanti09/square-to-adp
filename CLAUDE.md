# square-to-adp

A static single-page web app (no backend, no build step) that converts Square payroll exports into ADP-formatted import files.

## File structure

| File | Purpose |
|---|---|
| `index.html` | Page structure — form, upload zones, results section |
| `app.js` | All business logic — parsing, processing, validation, CSV generation |
| `styles.css` | All styling |
| `Back-House5.png` | Back-House logo (inverted white via CSS filter in header) |
| `draft-1/` | Frozen snapshot of the codebase at a point in time |

External CDN libs loaded in `index.html`: PapaParse (CSV), SheetJS/XLSX (Excel).

## What the app does

1. User selects restaurant + location, picks a week start date (Mondays only)
2. Uploads a Square CSV export and optionally a tips file (CSV or Excel)
3. App aggregates per-employee hours and matches tips by name
4. Generates an ADP-formatted CSV for upload into ADP

## ADP output format

- Row 1: `##GENERIC## V1.0,,,,,,,,,,` (11 fields, rest blank)
- Row 2: column headers
- Data rows: `ADP IID, W, PayPeriodStart, PayPeriodEnd, EmployeeId, EarningsCode, PayHours, Dollars, (blank), (blank), BASE`
- Pay Period Start = selected Monday; Pay Period End = that Sunday (+6 days)
- Pay Frequency always `W`; Rate Code always `BASE`; Separate Check and Department always blank

## Earnings codes generated

| Code | Source | Column populated |
|---|---|---|
| `REG` | Sum of Square "Regular hours" | Pay Hours |
| `OVT` | Sum of Square "Overtime hours" | Pay Hours |
| `CREDTIPP` | Tips matched by employee name | Dollars |
| `OTH2` | Spread-hour credits × $17 | Dollars |

Spread hour rate is `SPREAD_HOUR_RATE = 17` at the top of `app.js`.

## Square CSV columns used

`Employee number`, `First name`, `Last name`, `Regular hours`, `Overtime hours`, `Spread of hours credit`

Employee number (when present) becomes ADP Employee Id. No date filtering is applied — the entire uploaded Square file is processed; the user is responsible for uploading the correct week's export.

## Tips file matching

- Accepts CSV or Excel (.xlsx / .xls)
- Auto-detects name and amount columns; user can override via the column mapper UI
- Matching is fuzzy: tries `firstname lastname`, `lastname firstname`, and substring containment
- Validation reports CREDTIPP total and lists any tip-file names that couldn't be matched to a Square employee
- Does NOT compare against the raw tips file total column (avoids false mismatches from grand-total rows)

## Restaurants and ADP IIDs

```
L'industrie Pizzeria
  Brooklyn      → 32204797
  West Village  → 32204791
  Little Italy  → (blank — pending)

Court Street Grocers
  LaGuardia Place  → 30256751
  Northside        → 30264633
  Finkelstein & Ross → 30257633
  Midtown          → (blank — pending)
  Starship         → 30256821
  Commissary       → 30256765

Elbow Bread    → (blank — pending, no sub-location)
S&P Lunch      → (blank — pending, no sub-location)
```

ADP IIDs are configured in the `RESTAURANTS` array at the top of `app.js`.

## Key conventions

- No date filtering on Square rows — process everything in the uploaded file
- `fmt()` utility formats numbers to 2dp, drops trailing zeros for CSV output
- `toLocaleString('en-US', ...)` used for comma-formatted display numbers in the results summary
- Draft snapshots live in `draft-N/` folders; working files are always the root-level ones
