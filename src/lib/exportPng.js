import { domToPng } from "modern-screenshot";

export async function exportGraphicPng(element, filename = "top8.png") {
  await document.fonts.ready;
  const images = [...element.querySelectorAll("img")];
  await Promise.all(
    images.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            })
    )
  );

  const dataUrl = await domToPng(element, {
    width: 1920,
    height: 1080,
    scale: 1,
    backgroundColor: "#000000",
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
