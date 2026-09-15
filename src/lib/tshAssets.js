export const DEFAULT_CARD_COLOR = "#7c3aed";
export const TOP8_PLACEMENTS = [1, 2, 3, 4, 5, 5, 7, 7];
export const TOP9_COUNT = 4;

export function placementLabel(placement, compact = false) {
  if (compact || placement >= 9) return String(placement);
  if (placement === 1) return "1st";
  if (placement === 2) return "2nd";
  if (placement === 3) return "3rd";
  return `${placement}th`;
}

export function createPlayer(placement, extras = {}) {
  return {
    prefix: "",
    name: "",
    character: "",
    skin: 0,
    secondaries: [],
    cardColor: DEFAULT_CARD_COLOR,
    ...extras,
    placement,
  };
}

export function createEmptyPlayers() {
  return {
    top8: TOP8_PLACEMENTS.map((placement) => createPlayer(placement)),
    top9: Array.from({ length: TOP9_COUNT }, () => createPlayer(9)),
  };
}

export function findCharacter(game, query) {
  if (!game || !query) return null;
  const q = String(query).trim().toLowerCase();
  return (
    game.characters.find((character) => character.codename.toLowerCase() === q) ||
    game.characters.find((character) => character.name.toLowerCase() === q) ||
    game.characters.find((character) => (character.smashggName || "").toLowerCase() === q) ||
    null
  );
}

function packFile(pack, character, skin) {
  if (!pack?.files) return null;
  const files = pack.files[character.codename];
  if (!files) return null;
  const key = String(skin);
  return files[key] || files["0"] || Object.values(files)[0] || null;
}

export function artUrl(game, characterQuery, skin = 0) {
  const character = typeof characterQuery === "object" ? characterQuery : findCharacter(game, characterQuery);
  if (!game || !character) return null;
  const file = packFile(game.artPack, character, skin);
  return file ? `/tsh/${game.codename}/${file}` : null;
}

export function iconUrl(game, characterQuery, skin = 0) {
  const character = typeof characterQuery === "object" ? characterQuery : findCharacter(game, characterQuery);
  if (!game || !character) return null;
  const file = packFile(game.iconPack, character, skin);
  return file ? `/tsh/${game.codename}/${file}` : null;
}

export function getEyesight(game, characterQuery, skin = 0) {
  const character = typeof characterQuery === "object" ? characterQuery : findCharacter(game, characterQuery);
  const pack = game?.artPack;
  if (!character || !pack?.eyesights) return null;
  const byChar = pack.eyesights[character.codename];
  if (!byChar) return null;
  return byChar[String(skin)] || byChar["0"] || null;
}

export function getArtMeta(game, characterQuery, skin = 0) {
  const character = typeof characterQuery === "object" ? characterQuery : findCharacter(game, characterQuery);
  const pack = game?.artPack;
  if (!character || !pack) return null;
  const factor = pack.rescaling_factor?.[character.codename];
  const rescaling =
    typeof factor === "number" ? factor : factor?.[String(skin)] || factor?.["0"] || 1;
  return {
    eyesight: getEyesight(game, character, skin),
    averageSize: pack.average_size,
    uncroppedEdge: pack.uncropped_edge || [],
    rescalingFactor: rescaling,
    packType: pack.type || [],
    folder: pack.folder || "",
  };
}

export function computeArtStyle(img, container, meta, customCenter = [0.5, 0.48], customZoom = 1.15) {
  const width = container.clientWidth || 1;
  const height = container.clientHeight || 1;
  const naturalWidth = img.naturalWidth || 1;
  const naturalHeight = img.naturalHeight || 1;

  const eyesight = meta?.eyesight || {
    x: naturalWidth / 2,
    y: naturalHeight / 2,
  };
  const uncropped = meta?.uncroppedEdge || [];
  const rescalingFactor = meta?.rescalingFactor || 1;
  const averageSize = meta?.averageSize;

  let proportionalZoom = 1;
  if (averageSize?.x && averageSize?.y) {
    proportionalZoom = Math.max(
      (width / averageSize.x) * 1.2,
      (height / averageSize.y) * 1.2
    );
  }

  const zoomX = width / naturalWidth;
  const zoomY = height / naturalHeight;
  let zoom;

  if (!uncropped.length) {
    zoom = Math.max(zoomX, zoomY);
  } else if (!uncropped.includes("l") && !uncropped.includes("r")) {
    zoom = zoomX;
  } else if (!uncropped.includes("u") && !uncropped.includes("d")) {
    zoom = zoomY;
  } else {
    zoom = customZoom * proportionalZoom * rescalingFactor;
  }

  zoom = Math.max(zoom, customZoom * zoom);

  let xx = -eyesight.x * zoom + width * customCenter[0];
  let yy = -eyesight.y * zoom + height * customCenter[1];
  const maxMoveX = width - naturalWidth * zoom;
  const maxMoveY = height - naturalHeight * zoom;

  if (!uncropped.includes("l") && xx > 0) xx = 0;
  if (!uncropped.includes("r") && xx < maxMoveX) xx = maxMoveX;
  if (!uncropped.includes("u") && yy > 0) yy = 0;
  if (!uncropped.includes("d") && yy < maxMoveY) yy = maxMoveY;

  const fullyUncropped =
    uncropped.includes("u") &&
    uncropped.includes("d") &&
    uncropped.includes("l") &&
    uncropped.includes("r");
  if (fullyUncropped) {
    if (maxMoveX >= 0) xx = Math.min(maxMoveX, Math.max(0, xx));
    else xx = Math.min(0, Math.max(xx, maxMoveX));
    if (maxMoveY >= 0) yy = Math.min(maxMoveY, Math.max(0, yy));
    else yy = Math.min(0, Math.max(yy, maxMoveY));
  }

  return {
    backgroundImage: `url("${img.src}")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: `${xx}px ${yy}px`,
    backgroundSize: `${naturalWidth * zoom}px ${naturalHeight * zoom}px`,
  };
}
