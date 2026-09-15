import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createEmptyPlayers,
  createPlayer,
  TOP8_PLACEMENTS,
  TOP9_COUNT,
} from "./lib/tshAssets.js";

const GraphicContext = createContext(null);

const initialState = {
  gameCodename: "roa2",
  artPackFolder: "",
  tournamentName: "",
  eventName: "",
  numEntrants: 0,
  startggSlug: "",
  startggUrl: "",
  backgroundUrl: "",
  backgroundBrightness: 0.55,
  backgroundBlur: 8,
  ...createEmptyPlayers(),
};

export function GraphicProvider({ children }) {
  const [games, setGames] = useState([]);
  const [game, setGame] = useState(null);
  const [gamesError, setGamesError] = useState("");
  const [loadingGames, setLoadingGames] = useState(true);
  const [state, setState] = useState(initialState);

  async function loadCatalog() {
    setLoadingGames(true);
    try {
      const listRes = await fetch("/api/games");
      const list = await listRes.json();
      setGames(list.games || []);
      setGamesError(list.error || "");
      const preferred =
        (list.games || []).find((item) => item.codename === state.gameCodename) ||
        (list.games || [])[0];
      if (!preferred) {
        setGame(null);
        return;
      }
      const detailRes = await fetch(`/api/games/${preferred.codename}`);
      const detail = await detailRes.json();
      setGame(detail);
      setState((prev) => ({
        ...prev,
        gameCodename: detail.codename,
        artPackFolder: detail.artPack?.folder || "",
      }));
    } catch (error) {
      setGamesError(error.message || "No pude leer los artes de TSH");
    } finally {
      setLoadingGames(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  async function selectGame(codename) {
    setState((prev) => {
      let next = { ...prev, gameCodename: codename, artPackFolder: "" };
      if (codename === prev.gameCodename) return next;
      return { ...next, ...createEmptyPlayers() };
    });
    const detailRes = await fetch(`/api/games/${codename}`);
    const detail = await detailRes.json();
    setGame(detail);
    setState((prev) => ({
      ...prev,
      gameCodename: detail.codename,
      artPackFolder: detail.artPack?.folder || "",
    }));
  }

  function selectArtPack(folder) {
    setState((prev) => ({ ...prev, artPackFolder: folder }));
  }

  const activeGame = useMemo(() => {
    if (!game) return null;
    const artPack =
      (game.artPacks || []).find((pack) => pack.folder === state.artPackFolder) || game.artPack;
    return { ...game, artPack };
  }, [game, state.artPackFolder]);

  const api = useMemo(
    () => ({
      games,
      game: activeGame,
      gamesError,
      loadingGames,
      state,
      reloadGames: loadCatalog,
      selectGame,
      selectArtPack,
      patchState(partial) {
        setState((prev) => ({ ...prev, ...partial }));
      },
      updatePlayer(group, index, partial) {
        setState((prev) => {
          const list = prev[group].map((player, i) =>
            i === index ? { ...player, ...partial } : player
          );
          return { ...prev, [group]: list };
        });
      },
      applyImport(payload) {
        const top8 = TOP8_PLACEMENTS.map((placement, index) => {
          const match =
            payload.players.filter((player) => player.placement === placement)[
              TOP8_PLACEMENTS.slice(0, index).filter((item) => item === placement).length
            ] || payload.players[index];
          return createPlayer(placement, match || {});
        });
        const ninths = payload.players.filter((player) => player.placement >= 9);
        const top9 = Array.from({ length: TOP9_COUNT }, (_, index) =>
          createPlayer(9, ninths[index] || {})
        );
        setState((prev) => ({
          ...prev,
          tournamentName: payload.tournamentName || prev.tournamentName,
          eventName: payload.eventName || prev.eventName,
          numEntrants: payload.numEntrants || prev.numEntrants,
          startggSlug: payload.startggSlug || prev.startggSlug,
          top8,
          top9,
        }));
      },
    }),
    [games, activeGame, gamesError, loadingGames, state]
  );

  return <GraphicContext.Provider value={api}>{children}</GraphicContext.Provider>;
}

export function useGraphic() {
  const value = useContext(GraphicContext);
  if (!value) throw new Error("useGraphic must be used within GraphicProvider");
  return value;
}
