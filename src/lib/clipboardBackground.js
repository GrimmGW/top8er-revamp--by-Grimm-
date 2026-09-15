const BACKGROUND_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
]);

export function isBackgroundImageFile(file) {
  if (!file) return false;
  if (file.type && BACKGROUND_IMAGE_TYPES.has(file.type)) return true;
  return /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name || "");
}

export function getClipboardBackgroundFile(clipboardData) {
  if (!clipboardData) return null;

  const files = [...(clipboardData.files || [])];
  const fromList = files.find(isBackgroundImageFile);
  if (fromList) return fromList;

  const items = [...(clipboardData.items || [])];
  for (const item of items) {
    if (item.kind !== "file") continue;
    if (!BACKGROUND_IMAGE_TYPES.has(item.type)) continue;
    const file = item.getAsFile();
    if (file) return file;
  }

  return null;
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("No pude leer la imagen"));
    reader.readAsDataURL(file);
  });
}

export function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}
