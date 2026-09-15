import { useEffect, useRef, useState } from "react";
import { computeArtStyle } from "../lib/tshAssets.js";

export default function CharacterArt({ src, meta, customCenter, customZoom, className = "" }) {
  const ref = useRef(null);
  const [style, setStyle] = useState({ backgroundImage: src ? `url("${src}")` : "none" });

  useEffect(() => {
    if (!src || !ref.current) {
      setStyle({ backgroundImage: "none" });
      return;
    }

    let cancelled = false;
    const img = new Image();
    img.src = src;
    setStyle({ backgroundImage: `url("${src}")` });
    const apply = () => {
      if (cancelled || !ref.current || !img.naturalWidth) return;
      setStyle(computeArtStyle(img, ref.current, meta, customCenter, customZoom));
    };

    const observer = new ResizeObserver(apply);
    observer.observe(ref.current);
    img.onload = apply;
    if (img.complete) apply();

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [src, JSON.stringify(meta), JSON.stringify(customCenter), customZoom]);

  return <div ref={ref} className={`character-art ${className}`} style={style} />;
}
