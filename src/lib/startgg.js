export function parseStartggUrl(raw) {
  const value = (raw || "").trim();
  if (!value) return { error: "Pega un link de start.gg" };

  const cleaned = value.replace(/\/+$/, "");
  let url;
  try {
    url = new URL(cleaned.includes("://") ? cleaned : `https://${cleaned}`);
  } catch {
    return { error: "URL inválida" };
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const tournamentIndex = parts.indexOf("tournament");
  if (tournamentIndex >= 0 && parts[tournamentIndex + 1]) {
    const tournamentSlug = parts[tournamentIndex + 1];
    const eventIndex = parts.indexOf("event");
    const eventSlug =
      eventIndex >= 0 && parts[eventIndex + 1]
        ? `tournament/${tournamentSlug}/event/${parts[eventIndex + 1]}`
        : null;
    return { tournamentSlug, eventSlug };
  }

  if (url.hostname.includes("start.gg") && parts[0]) {
    return { tournamentSlug: parts[0], eventSlug: null };
  }

  return { error: "No pude leer el torneo desde ese link" };
}

const STANDINGS_QUERY = `
query Top8Standings($eventSlug: String!) {
  event(slug: $eventSlug) {
    id
    name
    numEntrants
    slug
    videogame { id name }
    tournament { id name slug }
    standings(query: { page: 1, perPage: 12 }) {
      nodes {
        placement
        entrant {
          id
          name
          participants {
            prefix
            gamerTag
          }
        }
      }
    }
  }
}
`;

const TOURNAMENT_EVENTS_QUERY = `
query TournamentEvents($slug: String!) {
  tournament(slug: $slug) {
    id
    name
    slug
    events {
      id
      name
      slug
      numEntrants
      videogame { id name }
    }
  }
}
`;

const SETS_QUERY = `
query EventSets($eventId: ID!, $page: Int!) {
  event(id: $eventId) {
    sets(page: $page, perPage: 40, sortType: RECENT) {
      pageInfo { totalPages }
      nodes {
        games {
          selections {
            entrant { id }
            character { id name }
          }
        }
      }
    }
  }
}
`;

export async function startggRequest(query, variables) {
  const response = await fetch("/api/startgg", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || `start.gg HTTP ${response.status}`);
  }
  if (payload.errors?.length) {
    throw new Error(payload.errors[0].message || "Error de start.gg");
  }
  return payload.data;
}

export async function fetchTournamentEvents(tournamentSlug) {
  const data = await startggRequest(TOURNAMENT_EVENTS_QUERY, { slug: tournamentSlug });
  return data.tournament;
}

export async function fetchEventStandings(eventSlug) {
  const data = await startggRequest(STANDINGS_QUERY, { eventSlug });
  return data.event;
}

function countCharacters(sets, wantedIds) {
  const counts = new Map();
  for (const id of wantedIds) counts.set(String(id), new Map());

  for (const set of sets) {
    for (const game of set.games || []) {
      for (const selection of game.selections || []) {
        const entrantId = String(selection.entrant?.id || "");
        const characterName = selection.character?.name;
        if (!counts.has(entrantId) || !characterName) continue;
        const map = counts.get(entrantId);
        map.set(characterName, (map.get(characterName) || 0) + 1);
      }
    }
  }

  const result = {};
  for (const [entrantId, map] of counts.entries()) {
    const ranked = [...map.entries()].sort((a, b) => b[1] - a[1]);
    result[entrantId] = {
      main: ranked[0]?.[0] || "",
      secondaries: ranked.slice(1).map(([name]) => name),
    };
  }
  return result;
}

export async function fetchCharacterUsage(eventId, entrantIds) {
  const wanted = new Set(entrantIds.map(String));
  const sets = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 8) {
    const data = await startggRequest(SETS_QUERY, { eventId, page });
    const pageSets = data.event?.sets;
    totalPages = pageSets?.pageInfo?.totalPages || 1;
    sets.push(...(pageSets?.nodes || []));
    page += 1;
  }

  return countCharacters(sets, wanted);
}

export function mapStandingToPlayer(node, usage, game) {
  const participant = node.entrant?.participants?.[0] || {};
  const usageEntry = usage[String(node.entrant?.id)] || { main: "", secondaries: [] };
  const main = game
    ? game.characters.find(
        (character) =>
          character.smashggName === usageEntry.main ||
          character.name === usageEntry.main ||
          character.codename === usageEntry.main
      )
    : null;

  const secondaries = (usageEntry.secondaries || [])
    .map((name) =>
      game?.characters.find(
        (character) =>
          character.smashggName === name || character.name === name || character.codename === name
      )
    )
    .filter(Boolean)
    .slice(0, 3)
    .map((character) => ({ character: character.codename, skin: 0 }));

  return {
    placement: node.placement,
    prefix: participant.prefix || "",
    name: participant.gamerTag || node.entrant?.name || "",
    character: main?.codename || "",
    skin: 0,
    secondaries,
  };
}

export async function importFromStartgg({ url, game }) {
  const parsed = parseStartggUrl(url);
  if (parsed.error) throw new Error(parsed.error);

  let eventSlug = parsed.eventSlug;
  let tournament = null;

  if (!eventSlug) {
    tournament = await fetchTournamentEvents(parsed.tournamentSlug);
    if (!tournament) throw new Error("No encontré ese torneo");
    const events = tournament.events || [];
    const match = game?.smashggGameId
      ? events.find((event) => Number(event.videogame?.id) === Number(game.smashggGameId))
      : null;
    const chosen = match || events[0];
    if (!chosen) throw new Error("Ese torneo no tiene eventos públicos");
    eventSlug = chosen.slug;
  }

  const event = await fetchEventStandings(eventSlug);
  if (!event) throw new Error("No encontré el evento");

  const standings = event.standings?.nodes || [];
  const usage = await fetchCharacterUsage(
    event.id,
    standings.map((node) => node.entrant?.id).filter(Boolean)
  );

  return {
    tournamentName: event.tournament?.name || tournament?.name || "",
    eventName: event.name || "",
    numEntrants: event.numEntrants || 0,
    startggSlug: event.tournament?.slug || parsed.tournamentSlug,
    eventSlug: event.slug,
    videogameId: event.videogame?.id || null,
    players: standings.map((node) => mapStandingToPlayer(node, usage, game)),
  };
}
