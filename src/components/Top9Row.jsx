import { iconUrl } from "../lib/tshAssets.js";

export default function Top9Row({ player, game }) {
  const url = iconUrl(game, player.character, player.skin);
  const hasPrefix = Boolean(player.prefix && player.prefix.trim());

  return (
    <div className="top9-row">
      <div className="top9-place">9</div>
      <div className="top9-namewrap">
        {hasPrefix ? <span className="top9-prefix">{player.prefix}</span> : null}
        <span className="top9-name">{player.name}</span>
      </div>
      <div className="top9-icon">{url ? <img src={url} alt="" /> : null}</div>
    </div>
  );
}
