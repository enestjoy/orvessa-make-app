import assert from "node:assert/strict";
import { test } from "node:test";
import { parseJsonc, stripJsonc } from "./lib/jsonc.mjs";

test("removes line and block comments outside strings", () => {
  const text = `{
    // the URL
    "url": "https://orvessa.uk/v1", /* trailing */
    "note": "keep // this and /* this */"
  }`;
  assert.deepEqual(parseJsonc(text), {
    url: "https://orvessa.uk/v1",
    note: "keep // this and /* this */",
  });
});

test("removes trailing commas in objects and arrays", () => {
  assert.deepEqual(parseJsonc('{"a": [1, 2,], "b": {"c": true,},}'), {
    a: [1, 2],
    b: { c: true },
  });
});

test("keeps escaped quotes inside strings", () => {
  assert.deepEqual(parseJsonc('{"q": "say \\"hi\\", // not a comment"}'), {
    q: 'say "hi", // not a comment',
  });
});

test("names the file when the JSON is broken", () => {
  assert.throws(() => parseJsonc("{", "src/base.jsonc"), /src\/base\.jsonc: invalid JSONC/);
});

test("leaves plain JSON unchanged", () => {
  assert.equal(stripJsonc('{"a":1}'), '{"a":1}');
});
