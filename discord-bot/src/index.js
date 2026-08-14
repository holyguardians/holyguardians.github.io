const DISCORD_API = "https://discord.com/api/v10";
const DAY_MS = 86400000;
const KST_OFFSET = 9 * 60 * 60 * 1000;
const INTERACTION_PING = 1;
const INTERACTION_COMMAND = 2;
const RESPONSE_PONG = 1;
const RESPONSE_MESSAGE = 4;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({ ok: true, bot: "Evil Guardians Raid Monitor" });
    }

    if (request.method === "POST" && url.pathname === "/setup") {
      if (request.headers.get("authorization") !== `Bearer ${env.SETUP_SECRET}`) {
        return new Response("Unauthorized", { status: 401 });
      }
      await registerGlobalCommands(env);
      return Response.json({ ok: true, commands: ["raid", "agenda", "configurar", "desativar"] });
    }

    if (request.method !== "POST" || url.pathname !== "/interactions") {
      return new Response("Not found", { status: 404 });
    }

    const signature = request.headers.get("x-signature-ed25519");
    const timestamp = request.headers.get("x-signature-timestamp");
    const body = await request.text();

    if (!signature || !timestamp || !await verifyDiscordRequest(body, signature, timestamp, env.DISCORD_PUBLIC_KEY)) {
      return new Response("Invalid request signature", { status: 401 });
    }

    const interaction = JSON.parse(body);
    if (interaction.type === INTERACTION_PING) {
      return Response.json({ type: RESPONSE_PONG });
    }

    if (interaction.type !== INTERACTION_COMMAND) {
      return discordMessage("Comando não reconhecido.", true);
    }

    const administrative = ["configurar", "desativar"].includes(interaction.data.name);
    ctx.waitUntil(handleCommand(interaction, env));
    return Response.json({ type: 5, data: administrative ? { flags: 64 } : undefined });
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduled(env, new Date(controller.scheduledTime)));
  }
};

async function handleCommand(interaction, env) {
  try {
    if (interaction.data.name === "configurar") {
      if (!interaction.guild_id) {
        return editInteraction(interaction, { content: "Este comando só pode ser usado dentro de um servidor." });
      }
      if (!hasManageGuild(interaction)) {
        return editInteraction(interaction, { content: "Você precisa da permissão **Gerenciar Servidor** para configurar o bot." });
      }
      const channelId = commandOption(interaction, "canal");
      const minutes = Math.min(60, Math.max(1, Number(commandOption(interaction, "minutos")) || 5));
      await env.SERVER_CONFIG.put(`guild:${interaction.guild_id}`, JSON.stringify({
        guildId: interaction.guild_id,
        channelId,
        minutes
      }));
      return editInteraction(interaction, {
        content: `✅ Alertas configurados em <#${channelId}>, **${minutes} minuto(s)** antes de cada boss.`
      });
    }

    if (interaction.data.name === "desativar") {
      if (!interaction.guild_id || !hasManageGuild(interaction)) {
        return editInteraction(interaction, { content: "Você precisa da permissão **Gerenciar Servidor** para desativar os alertas." });
      }
      await env.SERVER_CONFIG.put(`guild:${interaction.guild_id}`, JSON.stringify({
        guildId: interaction.guild_id,
        disabled: true
      }));
      return editInteraction(interaction, { content: "🔕 Alertas automáticos desativados neste servidor." });
    }

    const events = await loadEvents(env, new Date());
    if (interaction.data.name === "raid") {
      if (!events[0]) return editInteraction(interaction, { content: "Nenhum raid ativo encontrado." });
      return editInteraction(interaction, { embeds: [eventEmbed(events[0], env, "PRÓXIMO RAID BOSS")] });
    }
    if (interaction.data.name === "agenda") {
      const content = events.slice(0, 10).map((event, index) =>
        `**${index + 1}. ${event.name}** — <t:${Math.floor(event.nextTime.getTime() / 1000)}:R> — ${event.map}`
      ).join("\n");
      return editInteraction(interaction, { content: content || "Nenhum raid ativo encontrado." });
    }
    return editInteraction(interaction, { content: "Comando não reconhecido." });
  } catch (error) {
    console.error(error);
    return editInteraction(interaction, { content: "Não consegui consultar a agenda agora. Tente novamente em instantes." });
  }
}

async function editInteraction(interaction, payload) {
  const response = await fetch(
    `${DISCORD_API}/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  if (!response.ok) throw new Error(`Falha ao responder comando: ${response.status} ${await response.text()}`);
}

async function runScheduled(env, now) {
  const events = await loadEvents(env, now);
  const servers = await loadServerConfigs(env);

  for (const server of servers) {
    const alertMinutes = Math.min(60, Math.max(1, Number(server.minutes) || 5));
    const windowStart = alertMinutes * 60000;
    const windowEnd = windowStart - 60000;

    for (const event of events) {
      const diff = event.nextTime.getTime() - now.getTime();
      if (diff <= windowStart && diff > windowEnd) {
        try {
          await sendChannelMessage(env, server.channelId, {
            content: "@everyone",
            allowed_mentions: { parse: ["everyone"] },
            embeds: [eventEmbed(event, env, `⚠ RAID EM ${alertMinutes} MINUTOS`)]
          });
        } catch (error) {
          console.error(`Falha no servidor ${server.guildId}:`, error);
        }
      }
    }
  }
}

async function registerGlobalCommands(env) {
  const commands = [
    { name: "raid", description: "Mostra o próximo Raid Boss" },
    { name: "agenda", description: "Mostra os próximos Raid Bosses" },
    {
      name: "configurar",
      description: "Escolhe o canal e a antecedência dos alertas",
      default_member_permissions: "32",
      dm_permission: false,
      options: [
        { type: 7, name: "canal", description: "Canal que receberá os alertas", required: true },
        { type: 4, name: "minutos", description: "Antecedência entre 1 e 60 minutos", required: true, min_value: 1, max_value: 60 }
      ]
    },
    {
      name: "desativar",
      description: "Desativa os alertas automáticos neste servidor",
      default_member_permissions: "32",
      dm_permission: false
    }
  ];
  const response = await fetch(`${DISCORD_API}/applications/${env.DISCORD_APPLICATION_ID}/commands`, {
    method: "PUT",
    headers: discordHeaders(env),
    body: JSON.stringify(commands)
  });
  if (!response.ok) throw new Error(`Falha ao registrar comandos: ${response.status} ${await response.text()}`);

  const clearGuild = await fetch(`${DISCORD_API}/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.GUILD_ID}/commands`, {
    method: "PUT",
    headers: discordHeaders(env),
    body: "[]"
  });
  if (!clearGuild.ok) throw new Error(`Falha ao limpar comandos locais antigos: ${clearGuild.status} ${await clearGuild.text()}`);
}

async function sendChannelMessage(env, channelId, payload) {
  const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: discordHeaders(env),
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Falha ao enviar alerta: ${response.status} ${await response.text()}`);
}

function commandOption(interaction, name) {
  const option = (interaction.data.options || []).find(item => item.name === name);
  return option ? option.value : undefined;
}

function hasManageGuild(interaction) {
  try {
    return (BigInt(interaction.member?.permissions || "0") & 32n) === 32n;
  } catch {
    return false;
  }
}

async function loadServerConfigs(env) {
  const configs = [];
  let cursor;

  do {
    const listOptions = cursor ? { prefix: "guild:", cursor } : { prefix: "guild:" };
    const page = await env.SERVER_CONFIG.list(listOptions);
    const values = await Promise.all(page.keys.map(key => env.SERVER_CONFIG.get(key.name, "json")));
    values.filter(Boolean).forEach(config => configs.push(config));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  if (env.GUILD_ID && env.CHANNEL_ID && !configs.some(config => config.guildId === env.GUILD_ID)) {
    configs.push({
      guildId: env.GUILD_ID,
      channelId: env.CHANNEL_ID,
      minutes: Number(env.ALERT_MINUTES) || 5
    });
  }

  return configs.filter(config => !config.disabled && config.channelId);
}

function discordHeaders(env) {
  return {
    authorization: `Bot ${env.DISCORD_TOKEN}`,
    "content-type": "application/json"
  };
}

function discordMessage(content, ephemeral = false, embeds = []) {
  return Response.json({
    type: RESPONSE_MESSAGE,
    data: {
      content,
      embeds,
      flags: ephemeral ? 64 : 0
    }
  });
}

async function verifyDiscordRequest(body, signatureHex, timestamp, publicKeyHex) {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      hexToBytes(publicKeyHex),
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    const message = new TextEncoder().encode(timestamp + body);
    return crypto.subtle.verify("Ed25519", key, hexToBytes(signatureHex), message);
  } catch (error) {
    console.error("Falha ao verificar assinatura do Discord", error);
    return false;
  }
}

function hexToBytes(hex) {
  const clean = String(hex || "")
    .trim()
    .replace(/^0x/i, "")
    .replace(/\s+/g, "");
  if (!clean || clean.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(clean)) {
    throw new Error(`Hexadecimal inválido (${clean.length} caracteres)`);
  }
  return Uint8Array.from(clean.match(/.{2}/g), byte => parseInt(byte, 16));
}

function eventEmbed(event, env, title) {
  const unix = Math.floor(event.nextTime.getTime() / 1000);
  return {
    title: `${title} // ${event.name}`,
    color: attributeColor(event.attribute),
    description: `Nascimento: <t:${unix}:F> (<t:${unix}:R>)`,
    fields: [
      { name: "Level", value: String(event.level || "-"), inline: true },
      { name: "Attribute", value: event.attribute || "-", inline: true },
      { name: "HP", value: formatNumber(event.hp), inline: true },
      { name: "Mapa", value: event.map || "-", inline: false },
      { name: "Spots possíveis", value: event.spots.length ? `${event.spots.length} ponto(s) marcado(s) no site` : "Ainda não cadastrados", inline: false }
    ],
    thumbnail: event.iconUrl ? { url: event.iconUrl } : undefined,
    url: env.SITE_URL,
    footer: { text: "Evil Guardians // Horário sincronizado com o servidor KST" },
    timestamp: event.nextTime.toISOString()
  };
}

function attributeColor(attribute) {
  return ({ DATA: 0x3498db, VACCINE: 0x2ecc71, VIRUS: 0xe74c3c, UNKNOWN: 0xe056fd, FREE: 0xf1c40f })[attribute] || 0x52cfff;
}

function formatNumber(value) {
  return Number(value) > 0 ? Number(value).toLocaleString("pt-BR") : "-";
}

async function loadEvents(env, now) {
  const [bossesResponse, configResponse] = await Promise.all([
    fetchJson(`${env.HG_API_URL}?api=raid-bosses`),
    fetchJson(`${env.HG_API_URL}?api=raid-config`)
  ]);

  const events = (bossesResponse.raidBosses || [])
    .filter(boss => boss.enabled !== false)
    .map(boss => ({
      name: boss.name,
      level: boss.level,
      attribute: boss.attribute,
      hp: boss.hp,
      map: boss.map || boss.location,
      spots: Array.isArray(boss.spots) ? boss.spots : [],
      iconUrl: assetUrl(env, "raid_assets/icons/", boss.iconFile),
      nextTime: nextFixedRaid(boss, now)
    }))
    .filter(event => event.nextTime);

  const config = (configResponse.raidConfig || [])[0];
  if (config) {
    events.push({
      name: config.name,
      level: config.level,
      attribute: config.attribute,
      hp: config.hp,
      map: config.map,
      spots: parseSpots(config.spots),
      iconUrl: assetUrl(env, "raid_assets/icons/", config.iconFile),
      nextTime: nextRotation(config, now)
    });
  }

  return events.sort((a, b) => a.nextTime - b.nextTime);
}

async function fetchJson(url) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) throw new Error(`API respondeu ${response.status}`);
  const data = await response.json();
  if (!data.ok) throw new Error(data.error || "Resposta inválida da API");
  return data;
}

function nextFixedRaid(raid, now) {
  const type = String(raid.type || "").toLowerCase();
  if (type === "daily") {
    let target = kstDate(kstDateString(now), raid.time);
    if (target <= now) target = new Date(target.getTime() + DAY_MS);
    return target;
  }
  if (type === "weekly") return nextWeekly(raid.time, raid.days || [], now);
  if (type === "biweekly") {
    const base = kstDate(raid.baseDate, raid.time);
    const cycle = 14 * DAY_MS;
    let jumps = Math.max(0, Math.floor((now - base) / cycle));
    let target = new Date(base.getTime() + jumps * cycle);
    if (target <= now) target = new Date(target.getTime() + cycle);
    return target;
  }
  if (type === "custom") {
    return (raid.schedules || []).reduce((best, item) => {
      const candidate = nextWeekly(item.time, [Number(item.day)], now);
      return !best || candidate < best ? candidate : best;
    }, null);
  }
  return null;
}

function nextWeekly(time, days, now) {
  for (let offset = 0; offset < 14; offset++) {
    const day = new Date(now.getTime() + offset * DAY_MS);
    const target = kstDate(kstDateString(day), time);
    if (days.map(Number).includes(kstParts(target).day) && target > now) return target;
  }
  return null;
}

function nextRotation(config, now) {
  const cycleDays = Math.max(1, Number(config.cycleDays) || 14);
  const increment = Number(config.increment) || 0;
  const base = kstDate(config.cycleStart, config.baseTime);
  const cycleMs = cycleDays * DAY_MS;
  let cycle = Math.max(0, Math.floor((now - base) / cycleMs));
  for (let attempt = 0; attempt < 2; attempt++) {
    const start = new Date(base.getTime() + (cycle + attempt) * cycleMs);
    for (let day = 0; day < cycleDays; day++) {
      const target = new Date(start.getTime() + day * DAY_MS + day * increment * 60000);
      if (target > now) return target;
    }
  }
  return new Date(base.getTime() + (cycle + 1) * cycleMs);
}

function kstDate(date, time) {
  return new Date(`${date}T${time}:00+09:00`);
}

function kstParts(date) {
  const kst = new Date(date.getTime() + KST_OFFSET);
  return {
    year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1, date: kst.getUTCDate(), day: kst.getUTCDay()
  };
}

function kstDateString(date) {
  const p = kstParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.date).padStart(2, "0")}`;
}

function parseSpots(value) {
  if (Array.isArray(value)) return value;
  return String(value || "").split(";").map(pair => {
    const [x, y] = pair.trim().split(",").map(Number);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  }).filter(Boolean);
}

function assetUrl(env, folder, file) {
  if (!file) return "";
  return new URL(`${folder}${file}`, env.SITE_URL).href;
}

export { loadEvents };
