import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server.mjs";
import { catalog, normalize } from "../catalog.mjs";
import { validateRecipe, generateRecipe } from "../gemini.mjs";

const sample = {
  title: "Poêlée de courgettes à la feta",
  time: 20,
  vegetarian: true,
  ingredients: [
    { id: "courgette", quantity: "2" },
    { id: "feta", quantity: "100 g" },
  ],
  steps: [
    "Coupe les courgettes et fais-les cuire 12 minutes à feu moyen avec un peu d’huile.",
    "Ajoute la feta émiettée et laisse réchauffer deux minutes avant de servir.",
  ],
};
const provider = (value) => ({
  ok: true,
  json: async () => ({
    candidates: [
      {
        finishReason: "STOP",
        content: { parts: [{ text: JSON.stringify(value) }] },
      },
    ],
  }),
});
async function setup(t, options = {}) {
  const app = createApp({ dbPath: ":memory:", ...options });
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  t.after(
    () =>
      new Promise((r) =>
        app.server.close(() => {
          app.db.close();
          r();
        }),
      ),
  );
  const base = "http://127.0.0.1:" + app.server.address().port;
  const request = async (path, { method = "GET", body, cookie } = {}) => {
    const r = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      data: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  };
  const register = async (email) =>
    (
      await request("/api/auth/register", {
        method: "POST",
        body: { name: "Cuisine", email, password: "mot-de-passe-test-2026" },
      })
    ).cookie;
  return { ...app, request, register };
}
test("Expanded ingredient catalog has stable legacy IDs and personal products are isolated", async (t) => {
  assert.ok(catalog.length > 250);
  assert.equal(catalog.find((i) => i.name === "Œufs").id, "oeuf");
  assert.equal(new Set(catalog.map((i) => i.id)).size, catalog.length);
  const { request, register } = await setup(t);
  const a = await register("a@example.com"),
    b = await register("b@example.com");
  const added = await request("/api/ingredients", {
    method: "POST",
    cookie: a,
    body: { name: "Sauce maison au tamarin", category: "condiments" },
  });
  assert.equal(added.status, 201);
  assert.equal(
    (
      await request("/api/ingredients", {
        method: "POST",
        cookie: a,
        body: { name: "sauce maison au tamarin", category: "other" },
      })
    ).data.id,
    added.data.id,
  );
  assert.ok(
    !(await request("/api/ingredients", { cookie: b })).data.some(
      (i) => i.id === added.data.id,
    ),
  );
  assert.equal(
    (
      await request("/api/pantry", {
        method: "POST",
        cookie: a,
        body: { ingredient_id: added.data.id },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/pantry", {
        method: "POST",
        cookie: b,
        body: { ingredient_id: added.data.id },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/ingredients", {
        method: "POST",
        cookie: a,
        body: { name: "Test", category: "unknown" },
      })
    ).status,
    400,
  );
  assert.equal(normalize("ŒUFS"), "oeufs");
});
test("Generation saves a private recipe, reuses cache, supports favorites, enforces a global budget", async (t) => {
  let calls = 0;
  const { request, register } = await setup(t, {
    geminiKey: "test-only-key",
    dailyLimit: 2,
    fetchImpl: async (url, opts) => {
      calls++;
      assert.ok(url.endsWith("gemini-2.5-flash-lite:generateContent"));
      assert.equal(opts.headers["x-goog-api-key"], "test-only-key");
      assert.ok(!opts.body.includes("example.com"));
      return provider(sample);
    },
  });
  const a = await register("a@example.com"),
    b = await register("b@example.com");
  const generate = (cookie, extra = {}) =>
    request("/api/ai/generate", {
      method: "POST",
      cookie,
      body: { time: 30, vegetarian: true, ...extra },
    });
  const first = await generate(a);
  assert.equal(first.status, 201);
  assert.equal(first.data.remaining, 1);
  assert.equal(calls, 1);
  const reused = await generate(a);
  assert.equal(reused.status, 200);
  assert.equal(reused.data.cached, true);
  assert.equal(reused.data.id, first.data.id);
  assert.equal(calls, 1);
  const found = (await request("/api/recipes", { cookie: a })).data.find(
    (r) => r.id === first.data.id,
  );
  assert.equal(found.source, "gemini");
  assert.equal(found.image, null);
  assert.equal(found.missing.length, 0);
  assert.ok(
    !(await request("/api/recipes", { cookie: b })).data.some(
      (r) => r.id === first.data.id,
    ),
  );
  assert.equal(
    (
      await request("/api/favorites/" + first.data.id, {
        method: "PUT",
        cookie: a,
        body: {},
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/api/favorites/" + first.data.id, {
        method: "PUT",
        cookie: b,
        body: {},
      })
    ).status,
    404,
  );
  assert.equal((await generate(b)).status, 201);
  assert.equal(calls, 2);
  assert.equal((await generate(a, { fresh: true })).status, 429);
  assert.equal(calls, 2);
  assert.equal((await generate(a)).status, 200);
  assert.equal(
    (await request("/api/ai/status", { cookie: a })).data.remaining,
    0,
  );
});
test("Missing key, provider failures and invalid recipes fail safely without leaking secrets", async (t) => {
  const noKey = await setup(t);
  const cookie = await noKey.register("test@example.com");
  assert.equal(
    (
      await noKey.request("/api/ai/generate", {
        method: "POST",
        cookie,
        body: {},
      })
    ).status,
    503,
  );
  const bad = await setup(t, {
    geminiKey: "never-echo-me",
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: "never-echo-me" }),
    }),
  });
  const c = await bad.register("bad@example.com");
  const failed = await bad.request("/api/ai/generate", {
    method: "POST",
    cookie: c,
    body: {},
  });
  assert.equal(failed.status, 502);
  assert.ok(!JSON.stringify(failed.data).includes("never-echo-me"));
  assert.equal(
    (await bad.request("/api/recipes", { cookie: c })).data.filter(
      (r) => r.source === "gemini",
    ).length,
    0,
  );
  assert.equal(
    (await bad.request("/api/ai/status", { cookie: c })).data.used,
    1,
  );
  const pantry = [{ id: "courgette" }, { id: "feta" }];
  assert.throws(() =>
    validateRecipe(
      { ...sample, ingredients: [{ id: "invented", quantity: "1" }] },
      pantry,
    ),
  );
  assert.throws(() =>
    validateRecipe({ ...sample, time: 60 }, pantry, { time: 15 }),
  );
  assert.throws(() => validateRecipe({ ...sample, steps: [] }, pantry));
  assert.throws(() =>
    validateRecipe(
      { ...sample, ingredients: [{ id: "fish", quantity: "100 g" }] },
      [{ id: "fish", category: "fish" }],
    ),
  );
  await assert.rejects(() =>
    generateRecipe({
      apiKey: "x",
      pantry,
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
      }),
    }),
  );
});
test("Expired products are not sent to Gemini and invalid criteria never consume a call", async (t) => {
  let sent;
  const { request, register } = await setup(t, {
    geminiKey: "test-key",
    fetchImpl: async (url, opts) => {
      sent = JSON.parse(opts.body);
      return provider({
        ...sample,
        ingredients: [{ id: "feta", quantity: "100 g" }],
      });
    },
  });
  const cookie = await register("expiry@example.com");
  assert.equal(
    (
      await request("/api/ai/generate", {
        method: "POST",
        cookie,
        body: { time: -1 },
      })
    ).status,
    400,
  );
  assert.equal((await request("/api/ai/status", { cookie })).data.used, 0);
  await request("/api/pantry", {
    method: "POST",
    cookie,
    body: { ingredient_id: "courgette", expires: "2000-01-01" },
  });
  const response = await request("/api/ai/generate", {
    method: "POST",
    cookie,
    body: {},
  });
  assert.equal(response.status, 201);
  assert.ok(!sent.contents[0].parts[0].text.includes('"id":"courgette"'));
});
