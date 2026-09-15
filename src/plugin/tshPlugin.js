import path from "node:path";
import { Readable } from "node:stream";

const PACK_PRIORITY = ["art", "full", "mural_art"];
const SKIP_ART_PACKS = new Set([
  "base_files",
  "stage_icon",
  "stage_bg",
  "variant_icon",
  "css",
  "webm",
  "website",
]);
const JSDELIVR = "https://cdn.jsdelivr.net/gh/joaorb64/StreamHelperAssets@main";
const GITHUB_RAW = "https://raw.githubusercontent.com/joaorb64/StreamHelperAssets/main";
const CATALOG_TTL_MS = 60 * 60 * 1000;
const FETCH_HEADERS = {
  "User-Agent": "top8er-revamp",
  Accept: "*/*",
};

const MIME = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json",
};

function packScore(pack) {
  const types = pack.type || [];
  if (isIconPack(pack)) return -1;
  const preferred = PACK_PRIORITY.findIndex(
    (name) => pack.folder === name || pack.folder.endsWith(`/${name}`) || types.includes(name)
  );
  if (preferred >= 0) return 100 - preferred;
  const size = pack.average_size;
  if (size?.x && size?.y) return (size.x + size.y) / 1000;
  return 0;
}

function isIconPack(pack) {
  const types = pack.type || [];
  return (
    types.includes("icon") ||
    pack.folder === "icon" ||
    pack.folder === "css" ||
    pack.folder.endsWith("/icon")
  );
}

function addPackFile(files, folder, prefix, postfix, codename, skin) {
  const id = String(parseInt(skin, 10));
  if (Number.isNaN(Number(id)) || !codename) return;
  if (!files[codename]) files[codename] = {};
  if (files[codename][id]) return;
  files[codename][id] = `${folder}/${prefix}${codename}${postfix}${id}.png`;
}

function collectSkins(source) {
  if (!source || typeof source !== "object") return [];
  return Object.keys(source);
}

function buildPackFiles(folder, packConfig, gameConfig) {
  const prefix = packConfig.prefix || "";
  const postfix = packConfig.postfix || "";
  const files = {};
  const imageSizes = packConfig.image_sizes || {};
  const eyesights = packConfig.eyesights || {};

  for (const [codename, skins] of Object.entries(imageSizes)) {
    for (const skin of collectSkins(skins)) {
      addPackFile(files, folder, prefix, postfix, codename, skin);
    }
  }
  for (const [codename, skins] of Object.entries(eyesights)) {
    for (const skin of collectSkins(skins)) {
      addPackFile(files, folder, prefix, postfix, codename, skin);
    }
  }

  if (Object.keys(files).length) return files;

  const mapping = gameConfig.character_to_codename || {};
  for (const info of Object.values(mapping)) {
    const skins = collectSkins(info.skin_name);
    for (const skin of skins.length ? skins : ["0"]) {
      addPackFile(files, folder, prefix, postfix, info.codename, skin);
    }
  }
  return files;
}

function hydratePack(folder, packConfig, gameConfig) {
  return {
    ...packConfig,
    folder,
    files: buildPackFiles(folder, packConfig, gameConfig),
  };
}

function buildCharacters(gameConfig, artPack, iconPack) {
  const mapping = gameConfig.character_to_codename || {};
  return Object.entries(mapping).map(([name, info]) => {
    const codename = info.codename;
    const skinNames = info.skin_name || {};
    const artSkins = Object.keys(artPack?.files?.[codename] || {});
    const iconSkins = Object.keys(iconPack?.files?.[codename] || {});
    const namedSkins = Object.keys(skinNames);
    const skinIds = [...new Set([...namedSkins, ...artSkins, ...iconSkins])]
      .map((id) => String(parseInt(id, 10)))
      .filter((id) => !Number.isNaN(Number(id)))
      .sort((a, b) => Number(a) - Number(b));

    const skins = (skinIds.length ? skinIds : ["0"]).map((id) => ({
      id: Number(id),
      name: skinNames[id]?.name || skinNames[id] || `Skin ${id}`,
    }));

    return {
      name,
      codename,
      smashggName: info.smashgg_name || name,
      skins,
      hasArt: Boolean(artPack?.files?.[codename]),
      hasIcon: Boolean(iconPack?.files?.[codename]),
    };
  });
}

function slimPack(pack) {
  if (!pack) return null;
  return {
    folder: pack.folder,
    name: pack.name || pack.folder,
    description: pack.description || "",
    type: pack.type || [],
    prefix: pack.prefix || "",
    postfix: pack.postfix || "",
    eyesights: pack.eyesights || {},
    average_size: pack.average_size || null,
    uncropped_edge: pack.uncropped_edge || [],
    rescaling_factor: pack.rescaling_factor || {},
    files: pack.files || {},
  };
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function remoteUrls(relPath) {
  const clean = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  return [`${GITHUB_RAW}/${clean}`, `${JSDELIVR}/${clean}`];
}

function pathVariants(relPath) {
  const clean = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  const variants = [clean];
  const match = clean.match(/^(.*?)(\d+)(\.(png|webp|gif))$/i);
  if (match) {
    const raw = match[2];
    const n = String(parseInt(raw, 10));
    for (const skin of [n, n.padStart(2, "0"), n.padStart(4, "0")]) {
      const next = `${match[1]}${skin}${match[3]}`;
      if (!variants.includes(next)) variants.push(next);
    }
  }
  return variants;
}

async function fetchRemote(relPath, { variants = false } = {}) {
  const paths = variants ? pathVariants(relPath) : [relPath.replace(/\\/g, "/").replace(/^\/+/, "")];
  let lastError = new Error(`No pude leer ${relPath}`);
  for (const candidate of paths) {
    for (const url of remoteUrls(candidate)) {
      try {
        const response = await fetch(url, { headers: FETCH_HEADERS });
        if (response.ok) return response;
        lastError = Object.assign(new Error(`${response.status} ${url}`), { status: response.status });
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError;
}

async function fetchJson(relPath) {
  const response = await fetchRemote(relPath);
  return response.json();
}

async function fetchJsonOptional(relPath) {
  try {
    return await fetchJson(relPath);
  } catch {
    return null;
  }
}

function summarizeCatalog(assets) {
  const games = Object.entries(assets).map(([codename, info]) => ({
    codename,
    name: info.name || codename,
    smashggGameId: null,
    hasIcons: Boolean(info.assets?.css || info.assets?.["base_files"]),
  }));
  games.sort((a, b) => a.name.localeCompare(b.name));
  return { games, error: null, source: "StreamHelperAssets" };
}

async function loadIconPack(codename, packKeys, gameConfig) {
  const iconConfig = await fetchJsonOptional(`games/${codename}/base_files/icon/config.json`);
  if (iconConfig) return hydratePack("base_files/icon", iconConfig, gameConfig);

  if (packKeys.includes("css")) {
    const cssConfig = await fetchJsonOptional(`games/${codename}/css/config.json`);
    if (cssConfig) return hydratePack("css", cssConfig, gameConfig);
  }
  return null;
}

async function loadArtPacks(codename, packKeys, gameConfig) {
  const packs = [];
  await Promise.all(
    packKeys
      .filter((key) => !SKIP_ART_PACKS.has(key))
      .map(async (key) => {
        const config = await fetchJsonOptional(`games/${codename}/${key}/config.json`);
        if (!config) return;
        const pack = hydratePack(key, config, gameConfig);
        if (isIconPack(pack)) return;
        packs.push(pack);
      })
  );
  packs.sort((a, b) => packScore(b) - packScore(a));
  return packs;
}

async function loadGameDetail(codename, assetsJson) {
  const gameEntry = assetsJson[codename];
  if (!gameEntry) return null;

  const gameConfig = await fetchJsonOptional(`games/${codename}/base_files/config.json`);
  if (!gameConfig) return null;

  const packKeys = Object.keys(gameEntry.assets || {});
  const [iconPack, artPacks] = await Promise.all([
    loadIconPack(codename, packKeys, gameConfig),
    loadArtPacks(codename, packKeys, gameConfig),
  ]);
  const artPack = artPacks[0] || null;
  const characters = buildCharacters(gameConfig, artPack, iconPack);

  return {
    codename,
    name: gameConfig.name || gameEntry.name || codename,
    smashggGameId: gameConfig.smashgg_game_id || null,
    hasIcons: Boolean(iconPack),
    characterCount: characters.length,
    characters,
    artPack: slimPack(artPack),
    artPacks: artPacks.map(slimPack),
    iconPack: slimPack(iconPack),
  };
}

function safeAssetPath(relPath) {
  const decoded = decodeURIComponent(relPath).replace(/\\/g, "/").replace(/^\/+/, "");
  if (!decoded || decoded.includes("..") || path.isAbsolute(decoded)) return null;
  return decoded;
}

async function proxyAsset(relPath, res) {
  const clean = safeAssetPath(relPath);
  if (!clean) {
    res.statusCode = 400;
    res.end("Bad path");
    return;
  }

  try {
    const response = await fetchRemote(`games/${clean}`, { variants: true });
    const ext = path.extname(clean).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", MIME[ext] || response.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");
    if (response.body) {
      Readable.fromWeb(response.body).pipe(res);
      return;
    }
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    res.statusCode = error.status === 404 ? 404 : 502;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: error.message || "Asset remoto no encontrado" }));
  }
}

export function tshAssetsPlugin() {
  const detailCache = new Map();
  let catalogCache = { at: 0, assets: null, summary: null };

  async function getAssetsJson(refresh = false) {
    if (!refresh && catalogCache.assets && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
      return catalogCache.assets;
    }
    const assets = await fetchJson("assets.json");
    catalogCache = {
      at: Date.now(),
      assets,
      summary: summarizeCatalog(assets),
    };
    return assets;
  }

  async function getCatalog(refresh = false) {
    if (refresh) {
      detailCache.clear();
      catalogCache = { at: 0, assets: null, summary: null };
    }
    await getAssetsJson(refresh);
    return catalogCache.summary;
  }

  async function getGameDetail(codename, refresh = false) {
    if (!refresh && detailCache.has(codename)) return detailCache.get(codename);
    const assets = await getAssetsJson(refresh);
    const game = await loadGameDetail(codename, assets);
    if (game) detailCache.set(codename, game);
    return game;
  }

  async function handle(url, res) {
    if (url.pathname === "/api/games") {
      const catalog = await getCatalog(url.searchParams.get("refresh") === "1");
      return sendJson(res, 200, catalog);
    }

    const gameMatch = url.pathname.match(/^\/api\/games\/([^/]+)$/);
    if (gameMatch) {
      const game = await getGameDetail(
        decodeURIComponent(gameMatch[1]),
        url.searchParams.get("refresh") === "1"
      );
      if (!game) return sendJson(res, 404, { error: "Juego no encontrado" });
      return sendJson(res, 200, game);
    }

    if (url.pathname.startsWith("/tsh/")) {
      await proxyAsset(url.pathname.slice("/tsh/".length), res);
      return;
    }

    return false;
  }

  function attach(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url, "http://localhost");
      const isTsh =
        url.pathname === "/api/games" ||
        /^\/api\/games\/[^/]+$/.test(url.pathname) ||
        url.pathname.startsWith("/tsh/");
      if (!isTsh) {
        next();
        return;
      }

      handle(url, res).catch((error) => {
        if (!res.headersSent) {
          sendJson(res, 500, { error: error.message || "Error al leer StreamHelperAssets" });
        } else {
          res.end();
        }
      });
    });
  }

  return {
    name: "tsh-assets",
    configureServer(server) {
      attach(server);
    },
    configurePreviewServer(server) {
      attach(server);
    },
  };
}
