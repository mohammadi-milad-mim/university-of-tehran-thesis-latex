import test from "node:test";
import assert from "node:assert/strict";
import {requestAllowed} from "../server/requestPolicy.mjs";
const hosts = new Set(["127.0.0.1:5185", "localhost:5185"]);
test("Host and Origin policy works behind Docker without trusting network addresses", () => {
  const check = headers => requestAllowed({headers}, hosts);
  assert.equal(check({host: "127.0.0.1:5185"}), true);
  assert.equal(check({host: "localhost:5185", origin: "http://localhost:5185"}), true);
  for (const headers of [
    {host: "attacker.test:5185"},
    {host: "localhost:5185", origin: "http://attacker.test"},
    {host: "localhost:5185", origin: "null"},
    {host: "localhost:5185", "sec-fetch-site": "cross-site"},
  ]) assert.equal(check(headers), false);
});
