import PlayerCard from "./PlayerCard.jsx";
import Top9Row from "./Top9Row.jsx";
import { useGraphic } from "../store.jsx";

export default function GraphicCanvas() {
  const { state, game } = useGraphic();
  const [p1, p2, p3, p4, p5a, p5b, p7a, p7b] = state.top8;

  const bgStyle = state.backgroundUrl
    ? {
        backgroundImage: `url("${state.backgroundUrl}")`,
        filter: `brightness(${state.backgroundBrightness}) blur(${state.backgroundBlur}px)`,
      }
    : {
        filter: `brightness(${state.backgroundBrightness}) blur(${state.backgroundBlur}px)`,
      };

  return (
    <div id="graphic-canvas" className="graphic-canvas">
      <div
        className={state.backgroundUrl ? "graphic-bg-image" : "graphic-bg"}
        style={bgStyle}
      />
      <header className="graphic-header">
        <div className="graphic-header-left">
          <div className="graphic-title">{state.tournamentName}</div>
          <div className="graphic-subtitle">
            {state.numEntrants ? `${state.numEntrants} participantes` : ""}
          </div>
        </div>
        <div className="graphic-header-right">
          <div className="graphic-event">{state.eventName}</div>
          <div className="graphic-slug">
            {state.startggSlug ? `start.gg/${state.startggSlug.replace(/^tournament\//, "")}` : ""}
          </div>
        </div>
      </header>
      <div className="graphic-grid">
        <div className="slot-first">
          <PlayerCard player={p1} game={game} isFirst />
        </div>
        <div className="slot-2">
          <PlayerCard player={p2} game={game} />
        </div>
        <div className="slot-3">
          <PlayerCard player={p3} game={game} />
        </div>
        <div className="slot-4">
          <PlayerCard player={p4} game={game} />
        </div>
        <div className="slot-top9">
          <div className="top9-list">
            {state.top9.map((player, index) => (
              <Top9Row key={`top9-${index}`} player={player} game={game} />
            ))}
          </div>
        </div>
        <div className="slot-5a">
          <PlayerCard player={p5a} game={game} />
        </div>
        <div className="slot-5b">
          <PlayerCard player={p5b} game={game} />
        </div>
        <div className="slot-7a">
          <PlayerCard player={p7a} game={game} />
        </div>
        <div className="slot-7b">
          <PlayerCard player={p7b} game={game} />
        </div>
      </div>
    </div>
  );
}
