type StaticMapOptions = {
  width?: number;
  height?: number;
  zoom?: number;
};

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 360;
const DEFAULT_ZOOM = 15;

type Coordinates = {
  lat: number;
  lon: number;
};

const coordinateCache = new Map<string, Coordinates>();
const urlCache = new Map<string, string>();

const COORDINATE_PATTERN = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

function parseCoordinates(value: string): Coordinates | null {
  const match = COORDINATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  return {
    lat: Number(match[1]),
    lon: Number(match[2]),
  };
}

async function geocodeLocation(location: string): Promise<Coordinates | null> {
  const cached = coordinateCache.get(location);

  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let response: Response;

  try {
    response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(location)}`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "comp2003-app/1.0",
        },
        signal: controller.signal,
      }
    );
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    return null;
  }

  let results: Array<{ lat: string; lon: string }>;

  try {
    results = await response.json();
  } catch (error) {
    return null;
  }
  const first = results[0];

  if (!first) {
    return null;
  }

  const coords = {
    lat: Number(first.lat),
    lon: Number(first.lon),
  };

  if (Number.isNaN(coords.lat) || Number.isNaN(coords.lon)) {
    return null;
  }

  coordinateCache.set(location, coords);
  return coords;
}

export async function getStaticMapUrl(
  location: string,
  options: StaticMapOptions = {}
): Promise<string | null> {
  const trimmed = location.trim();

  if (!trimmed) {
    return null;
  }

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const zoom = options.zoom ?? DEFAULT_ZOOM;
  const size = `${width}x${height}`;
  const cacheKey = `${trimmed}|${size}|${zoom}`;

  const cachedUrl = urlCache.get(cacheKey);

  if (cachedUrl) {
    return cachedUrl;
  }

  const directCoords = parseCoordinates(trimmed);
  const coords = directCoords ?? (await geocodeLocation(trimmed));

  if (!coords) {
    return null;
  }

  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return null;
  }

  const marker = `pin-s+e02424(${coords.lon},${coords.lat})`;
  const url =
    "https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/" +
    `${marker}/${coords.lon},${coords.lat},${zoom},0/` +
    `${width}x${height}@2x` +
    `?access_token=${token}`;

  urlCache.set(cacheKey, url);
  return url;
}
