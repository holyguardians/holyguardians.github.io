import assert from "node:assert/strict";
import { loadEvents } from "../src/index.js";

const env = {
  HG_API_URL: "https://api.example.test/exec",
  SITE_URL: "https://holyguardians.github.io/"
};

globalThis.fetch = async url => {
  const text = String(url);
  const data = text.includes("raid-bosses")
    ? {
        ok: true,
        raidBosses: [
          { name: "Pumpkinmon", level: 91, attribute: "DATA", hp: 2481551, map: "Shibuya", iconFile: "pumpmon.webp", type: "daily", time: "19:30", spots: [], enabled: true },
          { name: "Kingdrasil_7D6", level: 100, attribute: "UNKNOWN", hp: 99999999, map: "Infinite Mountain", iconFile: "yggdrasill_7d6.webp", type: "custom", schedules: [{ day: 5, time: "21:00" }], spots: [], enabled: true },
          { name: "Boss desativado", type: "daily", time: "20:00", enabled: false }
        ]
      }
    : {
        ok: true,
        raidConfig: [{ name: "Kimeramon", cycleStart: "2026-08-13", baseTime: "19:00", increment: 25, cycleDays: 14, map: "Desert Area", iconFile: "rotation_boss.webp", spots: "50.9849,42.3209; 45.3686,26.3093", level: 101, attribute: "DATA", hp: 4873672 }]
      };
  return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
};

const events = await loadEvents(env, new Date("2026-08-14T00:00:00Z"));
assert.equal(events.length, 3, "Boss desativado deve ser ignorado e o rotativo incluído");
assert.ok(events.every(event => event.nextTime instanceof Date && !Number.isNaN(event.nextTime.valueOf())));
assert.ok(events.every((event, index) => index === 0 || events[index - 1].nextTime <= event.nextTime));
assert.equal(events.find(event => event.name === "Kingdrasil_7D6")?.hp, 99999999);
assert.equal(events.find(event => event.name === "Kimeramon")?.spots.length, 2);
console.log("Agenda, filtro ENABLED, rotação e ordenação validados.");
