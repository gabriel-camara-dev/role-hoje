export function todayDate() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getCoordinateBounds(latitude: number, longitude: number, radiusKm: number) {
  const latitudeDelta = radiusKm / 111;
  const longitudeDelta = radiusKm / (111 * Math.cos(toRadians(latitude)));

  return {
    minLatitude: latitude - latitudeDelta,
    maxLatitude: latitude + latitudeDelta,
    minLongitude: longitude - longitudeDelta,
    maxLongitude: longitude + longitudeDelta,
  };
}

export function getDistanceKm(
  originLatitude: number,
  originLongitude: number,
  targetLatitude: number,
  targetLongitude: number,
) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(targetLatitude - originLatitude);
  const longitudeDelta = toRadians(targetLongitude - originLongitude);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(originLatitude)) * Math.cos(toRadians(targetLatitude)) * Math.sin(longitudeDelta / 2) ** 2;

  return Number((earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
