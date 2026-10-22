import assert from "node:assert/strict";
import { test } from "node:test";

import builtInThemes from "../../node_modules/daisyui/functions/themeOrder.js";
import { parseTheme, themes } from "../../src/shared/schemas/theme";

test("theme choices match every built-in DaisyUI theme", () => {
  assert.deepEqual(themes, builtInThemes);
  for (const theme of themes) assert.equal(parseTheme(theme), theme);
});

test("legacy and invalid theme preferences fall back to light", () => {
  for (const value of ["system", "custom", "dark; Path=/", "", null, undefined, {}]) {
    assert.equal(parseTheme(value), "light");
  }
});
