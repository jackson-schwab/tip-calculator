# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A static tip calculator / bill splitter written in plain HTML, CSS and JavaScript. It has no build step, package manager or dependencies, and it must keep working when `index.html` is opened directly from disk (`file://`). That means classic `<script>` tags only: no ES modules (`file://` blocks them) and no `fetch` of local files.

The machine has no Node or Python. Git is installed but may not be on PATH in an already-open shell. In PowerShell, refresh it with:
`$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`

## Workflow

Commit after every completed step so the user can roll back to any point. Don't batch several steps into one commit.

## Deployment

The repo is `jackson-schwab/tip-calculator` on GitHub (public). GitHub Pages serves the `main` branch root at https://jackson-schwab.github.io/tip-calculator/, so pushing to `main` deploys. The GitHub CLI (`gh`) is installed at `C:\Program Files\GitHub CLI\gh.exe` and signed in.

A separate private copy is published as a claude.ai artifact at https://claude.ai/artifact/5Hi3LkgRMH8vMznMmKqNR7. It is a single self-contained page with the CSS and JS inlined. It does not update on push and needs republishing by hand.

## Running tests

Tests live in `tests.html` and run in a browser. To run them headlessly and print the results:

```powershell
$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
$url = 'file:///' + ((Resolve-Path tests.html).Path -replace '\\','/')
$html = & $edge --headless --disable-gpu --no-first-run --user-data-dir="$env:TEMP\claude\edge-test-profile" --dump-dom $url | Out-String
([regex]::Matches($html, '<div class="(pass|fail)">([^<]*)</div>') | % { $_.Groups[2].Value }) -join "`n"
```

There's no single-test filter. To run one test, temporarily comment out the others, or read just its line in the output. For end-to-end UI checks, load `index.html` in an iframe from a scratch page and drive it with DOM events. This needs Edge's `--allow-file-access-from-files` flag so the outer page can reach `iframe.contentDocument`.

## Architecture

- `calc.js` holds all money math as pure functions with no DOM access. It exposes `window.TipCalc` in the browser, or `module.exports` if loaded under CommonJS.
  - All amounts are **integer cents**. Convert input with `toCents` and display with `formatCents`.
  - `allocate(totalCents, weights)` (largest-remainder method) is how every split is done, so parts always sum exactly to the total. Any new split logic should go through it rather than dividing and rounding.
  - `splitEven` and `splitByItems` both return `{ bill, people: [{ subtotalCents, taxCents, tipCents, totalCents, items? }] }`, so the UI renders both modes with the same code.
  - In `splitByItems`, an item with an empty `sharedBy` is split among everyone. Tax is allocated in proportion to each person's food subtotal. The tip is computed once on the whole bill and then allocated in proportion to subtotal (plus tax when `tipOnTax`).
- `app.js` handles UI wiring in an IIFE.
  - `state` holds the tip percent, the mode (`'even'` or `'items'`), and the people and items. People are referenced by a stable `id` (items keep a `Set` of ids in `sharedBy`), and ids are mapped to array indices only when calling `splitByItems`.
  - `update()` recomputes and re-renders the summary on every input. `renderPeopleList` and `renderItemList` rebuild their lists only on structural changes (add, remove, rename), so inputs don't lose focus while someone is typing. Chip toggles update `aria-pressed` in place for the same reason.
  - In items mode the subtotal field is hidden, and the subtotal is the sum of item prices.
- `styles.css` uses color tokens on `:root` with a `prefers-color-scheme: dark` override. Toggle-button state (tip presets, mode switch, chips) is styled from `aria-pressed`.
