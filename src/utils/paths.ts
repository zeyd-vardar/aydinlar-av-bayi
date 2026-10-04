const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function normalizeInternalPath(path: string) {
  const match = path.match(/^([^?#]*)([?#].*)?$/);
  if (!match) return path;

  const pathname = match[1];
  const suffix = match[2] ?? '';
  const hasFileExtension = /\/[^/]+\.[a-z0-9]+$/i.test(pathname);
  const normalizedPathname =
    pathname === '/' || pathname.endsWith('/') || hasFileExtension ? pathname : `${pathname}/`;

  return `${normalizedPathname}${suffix}`;
}

export function withBase(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  return `${basePath}${normalizeInternalPath(path)}` || '/';
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
