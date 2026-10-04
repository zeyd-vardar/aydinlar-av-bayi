const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  return `${basePath}${path}` || '/';
}

export function imageVariant(path: string, width: number) {
  const extensionIndex = path.lastIndexOf('.');
  if (extensionIndex === -1) return path;
  return `${path.slice(0, extensionIndex)}-${width}${path.slice(extensionIndex)}`;
}

export function responsiveImageSrcSet(path: string, widths: number[], originalWidth?: number) {
  const variants = widths.map((width) => `${withBase(imageVariant(path, width))} ${width}w`);
  if (originalWidth) variants.push(`${withBase(path)} ${originalWidth}w`);
  return variants.join(', ');
}
