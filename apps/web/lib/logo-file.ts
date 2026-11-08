/** Logo dosyasını en fazla 1024px ve ~800KB olacak şekilde küçültür. */
export async function shrinkLogo(file: File, maxBytes = 800_000) {
  if (file.size <= maxBytes && file.size <= 1024 * 1024) return file;
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("logo"));
      node.src = url;
    });
    const longest = Math.max(image.width, image.height) || 1;
    const scale = Math.min(1, 1024 / longest);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, width, height);
    let quality = 0.88;
    let blob: Blob | null = null;
    while (quality >= 0.5) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= maxBytes) break;
      quality -= 0.1;
    }
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "logo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function putFileInInput(input: HTMLInputElement, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
}
