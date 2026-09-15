import { useEffect, useMemo, useState } from "react";
import { useGraphic } from "../store.jsx";
import { exportGraphicPng } from "../lib/exportPng.js";
import { importFromStartgg } from "../lib/startgg.js";
import { iconUrl, placementLabel } from "../lib/tshAssets.js";
import {
  fileToDataUrl,
  getClipboardBackgroundFile,
  isBackgroundImageFile,
  isTypingTarget,
} from "../lib/clipboardBackground.js";

function CharacterSelect({ game, value, onChange, allowEmpty = true }) {
  const options = game?.characters || [];
  return (
    <div className="select is-fullwidth">
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        {allowEmpty ? <option value="">Sin personaje</option> : null}
        {options.map((character) => (
          <option key={character.codename} value={character.codename}>
            {character.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function SkinSelect({ game, character, value, onChange }) {
  const skins = useMemo(() => {
    const found = game?.characters.find((item) => item.codename === character);
    return found?.skins || [{ id: 0, name: "Default" }];
  }, [game, character]);

  return (
    <div className="select is-fullwidth">
      <select
        value={String(value ?? 0)}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={!character}
      >
        {skins.map((skin) => (
          <option key={skin.id} value={skin.id}>
            {skin.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function PlayerEditor({ title, player, index, group, compact = false }) {
  const { game, updatePlayer } = useGraphic();
  const [secondaryPick, setSecondaryPick] = useState("");

  function addSecondary() {
    if (!secondaryPick) return;
    const next = [...(player.secondaries || []), { character: secondaryPick, skin: 0 }];
    updatePlayer(group, index, { secondaries: next });
    setSecondaryPick("");
  }

  function removeSecondary(i) {
    updatePlayer(group, index, {
      secondaries: player.secondaries.filter((_, idx) => idx !== i),
    });
  }

  return (
    <div className="box player-editor">
      <p className="title is-6">{title}</p>
      <div className="field">
        <label className="label">Prefix</label>
        <div className="control">
          <input
            className="input"
            value={player.prefix}
            onChange={(event) => updatePlayer(group, index, { prefix: event.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label className="label">Jugador</label>
        <div className="control">
          <input
            className="input"
            value={player.name}
            onChange={(event) => updatePlayer(group, index, { name: event.target.value })}
          />
        </div>
      </div>
      <div className="field">
        <label className="label">Personaje</label>
        <CharacterSelect
          game={game}
          value={player.character}
          onChange={(character) => updatePlayer(group, index, { character, skin: 0 })}
        />
      </div>
      <div className="field">
        <label className="label">Skin</label>
        <SkinSelect
          game={game}
          character={player.character}
          value={player.skin}
          onChange={(skin) => updatePlayer(group, index, { skin })}
        />
      </div>
      {!compact && game?.hasIcons ? (
        <div className="field">
          <label className="label">Secundarios (icono)</label>
          <div className="field has-addons">
            <div className="control is-expanded">
              <CharacterSelect game={game} value={secondaryPick} onChange={setSecondaryPick} />
            </div>
            <div className="control">
              <button type="button" className="button is-link" onClick={addSecondary}>
                Añadir
              </button>
            </div>
          </div>
          <div className="secondary-chips">
            {(player.secondaries || []).map((secondary, i) => {
              const url = iconUrl(game, secondary.character, secondary.skin || 0);
              return (
                <span key={`${secondary.character}-${i}`} className="tag is-dark is-medium" onClick={() => removeSecondary(i)}>
                  {url ? <img src={url} alt="" width="18" height="18" style={{ marginRight: 6 }} /> : null}
                  {secondary.character} ×
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
      {!compact ? (
        <div className="field">
          <label className="label">Color de tarjeta</label>
          <input
            type="color"
            value={player.cardColor || "#7c3aed"}
            onChange={(event) => updatePlayer(group, index, { cardColor: event.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function EditorPanel() {
  const { games, game, gamesError, loadingGames, state, patchState, selectGame, selectArtPack, applyImport } =
    useGraphic();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function onPaste(event) {
      const file = getClipboardBackgroundFile(event.clipboardData);
      if (!file) return;

      const pastedText = event.clipboardData?.getData("text/plain")?.trim();
      if (isTypingTarget(event.target) && pastedText) return;

      event.preventDefault();
      try {
        const backgroundUrl = await fileToDataUrl(file);
        patchState({ backgroundUrl });
        setMessage("Fondo pegado desde el portapapeles.");
      } catch (error) {
        setMessage(error.message || "No pude usar esa imagen de fondo");
      }
    }

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [patchState]);

  async function handleImport(event) {
    event.preventDefault();
    setMessage("");
    setImporting(true);
    try {
      const payload = await importFromStartgg({
        url: state.startggUrl,
        game,
      });
      applyImport(payload);
      setMessage("Importado desde start.gg. Revisa skins y secundarios.");
    } catch (error) {
      setMessage(error.message || "No pude importar el evento");
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setMessage("");
    try {
      const el = document.getElementById("graphic-canvas");
      const slug = (state.startggSlug || state.tournamentName || "top8")
        .replace(/[^\w-]+/g, "-")
        .replace(/^-|-$/g, "");
      await exportGraphicPng(el, `${slug || "top8"}.png`);
    } catch (error) {
      setMessage(error.message || "No pude exportar el PNG");
    } finally {
      setExporting(false);
    }
  }

  async function applyBackgroundFile(file) {
    if (!isBackgroundImageFile(file)) {
      setMessage("El fondo tiene que ser PNG, JPG, WebP o GIF.");
      return;
    }
    const backgroundUrl = await fileToDataUrl(file);
    patchState({ backgroundUrl });
  }

  function onBackground(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    applyBackgroundFile(file).catch((error) => {
      setMessage(error.message || "No pude usar esa imagen de fondo");
    });
  }

  return (
    <div className="editor-pane">
      <div className="box">
        <p className="title is-5">Torneo</p>
        <div className="field">
          <label className="label">Juego</label>
          <div className="select is-fullwidth">
            <select
              value={state.gameCodename}
              onChange={(event) => selectGame(event.target.value)}
              disabled={loadingGames}
            >
              {games.map((item) => (
                <option key={item.codename} value={item.codename}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          {gamesError ? <p className="help is-danger">{gamesError}</p> : null}
        </div>
        <div className="field">
          <label className="label">Tipo de assets</label>
          <div className="select is-fullwidth">
            <select
              value={state.artPackFolder}
              onChange={(event) => selectArtPack(event.target.value)}
              disabled={!game?.artPacks?.length}
            >
              {(game?.artPacks || []).map((pack) => (
                <option key={pack.folder} value={pack.folder}>
                  {pack.name || pack.folder}
                </option>
              ))}
            </select>
          </div>
          {game?.artPack?.description ? (
            <p className="help">{game.artPack.description}</p>
          ) : null}
        </div>
        <div className="field">
          <label className="label">Nombre</label>
          <input
            className="input"
            value={state.tournamentName}
            onChange={(event) => patchState({ tournamentName: event.target.value })}
          />
        </div>
        <div className="field">
          <label className="label">Evento</label>
          <input
            className="input"
            value={state.eventName}
            onChange={(event) => patchState({ eventName: event.target.value })}
          />
        </div>
        <div className="columns">
          <div className="column">
            <div className="field">
              <label className="label">Participantes</label>
              <input
                className="input"
                type="number"
                min="0"
                value={state.numEntrants}
                onChange={(event) => patchState({ numEntrants: Number(event.target.value) })}
              />
            </div>
          </div>
          <div className="column">
            <div className="field">
              <label className="label">start.gg slug</label>
              <input
                className="input"
                value={state.startggSlug}
                onChange={(event) => patchState({ startggSlug: event.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="box">
        <p className="title is-5">Importar start.gg</p>
        <form onSubmit={handleImport}>
          <div className="field">
            <label className="label">Link del torneo o evento</label>
            <input
              className="input"
              placeholder="https://www.start.gg/tournament/.../event/..."
              value={state.startggUrl}
              onChange={(event) => patchState({ startggUrl: event.target.value })}
            />
          </div>
          <button type="submit" className={`button is-link ${importing ? "is-loading" : ""}`}>
            Traer Top 8
          </button>
        </form>
      </div>

      <div className="box">
        <p className="title is-5">Fondo</p>
        <div className="field">
          <input
            className="input"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif"
            onChange={onBackground}
          />
          <p className="help">PNG, JPG, WebP o GIF. También puedes pegar con Ctrl+V.</p>
        </div>
        {state.backgroundUrl ? (
          <button type="button" className="button is-small mb-3" onClick={() => patchState({ backgroundUrl: "" })}>
            Quitar imagen
          </button>
        ) : null}
        <div className="field">
          <label className="label">Brillo ({state.backgroundBrightness.toFixed(2)})</label>
          <input
            type="range"
            min="0.2"
            max="1.4"
            step="0.01"
            value={state.backgroundBrightness}
            onChange={(event) => patchState({ backgroundBrightness: Number(event.target.value) })}
          />
        </div>
        <div className="field">
          <label className="label">Blur ({state.backgroundBlur}px)</label>
          <input
            type="range"
            min="0"
            max="24"
            step="1"
            value={state.backgroundBlur}
            onChange={(event) => patchState({ backgroundBlur: Number(event.target.value) })}
          />
        </div>
        <button
          type="button"
          className={`button is-primary is-fullwidth ${exporting ? "is-loading" : ""}`}
          onClick={handleExport}
        >
          Exportar PNG 1920×1080
        </button>
        {message ? <p className="help mt-2">{message}</p> : null}
      </div>

      <p className="title is-5">Top 8</p>
      {state.top8.map((player, index) => (
        <PlayerEditor
          key={`top8-${index}`}
          title={`${placementLabel(player.placement)} — ${player.name || "vacío"}`}
          player={player}
          index={index}
          group="top8"
        />
      ))}

      <p className="title is-5 mt-5">Top 9</p>
      {state.top9.map((player, index) => (
        <PlayerEditor
          key={`top9-${index}`}
          title={`9th — ${player.name || "vacío"}`}
          player={player}
          index={index}
          group="top9"
          compact
        />
      ))}
    </div>
  );
}
