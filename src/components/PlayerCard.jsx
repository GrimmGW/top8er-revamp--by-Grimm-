import CharacterArt from "./CharacterArt.jsx";
import { artUrl, getArtMeta, iconUrl, placementLabel } from "../lib/tshAssets.js";

// Zoom: más bajo = más atrás. Center Y: más bajo = personaje más arriba.
const FIRST_CENTER = [0.42, 0.47];
const CARD_CENTER = [0.5, 0.41];
const FIRST_ZOOM = 0.95;
const CARD_ZOOM = 1.06;

export default function PlayerCard({ player, game, isFirst = false }) {
  const src = artUrl(game, player.character, player.skin);
  const meta = getArtMeta(game, player.character, player.skin);
  const hasPrefix = Boolean(player.prefix && player.prefix.trim());
  const placeClass =
    player.placement === 1 ? "is-1st" : player.placement === 2 ? "is-2nd" : player.placement === 3 ? "is-3rd" : "";

  return (
    <div className={`player-card ${isFirst ? "first" : ""} ${hasPrefix ? "has-prefix" : "no-prefix"}`}>
      <div className="card-shape">
        <div className="card-art">
          <div className="card-fill" style={{ background: player.cardColor || "#7c3aed" }} />
          {src ? (
            <CharacterArt
              src={src}
              meta={meta}
              customCenter={isFirst ? FIRST_CENTER : CARD_CENTER}
              customZoom={isFirst ? FIRST_ZOOM : CARD_ZOOM}
            />
          ) : null}
          {game?.hasIcons && player.secondaries?.length ? (
            <div className="secondary-icons">
              {player.secondaries.map((secondary, index) => {
                const url = iconUrl(game, secondary.character, secondary.skin || 0);
                return url ? <img key={`${secondary.character}-${index}`} src={url} alt="" /> : null;
              })}
            </div>
          ) : null}
          <div className={`placement ${placeClass}`}>{placementLabel(player.placement)}</div>
        </div>
        <div className="nameplate">
          <div className="player-name">{player.name}</div>
          {hasPrefix ? <div className="player-prefix">{player.prefix}</div> : null}
        </div>
      </div>
    </div>
  );
}
