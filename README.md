# Tip Calculator

A small web app that works out the tip on a meal and splits the bill among friends:

- **Evenly**: everyone pays the same, give or take a cent.
- **By what each person ordered**: add people and items, then tap who shared each item. Each person's share of tax and tip is proportional to what they ordered.

Tip presets go from 15% to 25%, and you can enter a custom percentage. Tax can be entered as a dollar amount or a rate. By default the tip is calculated before tax; a checkbox includes tax.

## Running

There's no build step or dependencies. Open `index.html` in a browser.

## Tests

Open `tests.html` in a browser. Each test shows PASS or FAIL, and the page title becomes `PASS` or `FAIL`.
