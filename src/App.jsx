import { useEffect, useRef, useState } from "react";
import GraphicCanvas from "./components/GraphicCanvas.jsx";
import EditorPanel from "./components/EditorPanel.jsx";
import { useGraphic } from "./store.jsx";

export default function App() {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(0.45);
  const { loadingGames, gamesError } = useGraphic();

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;

    const fit = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      const next = Math.min(1, width / 1920, height / 1080);
      setScale(Math.max(0.18, next));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="editor-shell">
      <div className="editor-topbar">
        <h1>Top 8 Creator</h1>
        <p className="is-size-7 has-text-grey-light">
          Artes TSH remotos · Smash Hub layout · start.gg opcional
        </p>
      </div>
      {gamesError ? (
        <div className="notification is-danger is-light">{gamesError}</div>
      ) : null}
      <div className="columns is-variable is-4">
        <div className="column is-8">
          <div className="preview-host" ref={wrapRef}>
            {loadingGames ? (
              <p className="p-5">Cargando juegos TSH…</p>
            ) : (
              <div
                className="preview-pane"
                style={{
                  width: 1920 * scale,
                  height: 1080 * scale,
                }}
              >
                <div
                  className="preview-scaler"
                  style={{ transform: `scale(${scale})` }}
                >
                  <GraphicCanvas />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="column is-4">
          <EditorPanel />
        </div>
      </div>
    </div>
  );
}
