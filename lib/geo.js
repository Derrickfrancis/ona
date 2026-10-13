const EARTH_RADIUS_KM = 6371;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

// Straight-line distance between two coordinates, in kilometres
export function distanceKm(latA, lngA, latB, lngB) {
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// The closest few stops to a point, nearest first, within maxKm
export function findNearbyStops(lat, lng, stops, maxKm = 3, limit = 3) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

  return stops
    .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng))
    .map((stop) => ({
      stop,
      distanceKm: distanceKm(lat, lng, stop.lat, stop.lng),
    }))
    .filter((entry) => entry.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

// Closest stop to a point, or null if nothing is within maxKm
export function findNearestStop(lat, lng, stops, maxKm = 3) {
  return findNearbyStops(lat, lng, stops, maxKm, 1)[0] || null;
}

// Short, human distance: "250 m" under a kilometre, otherwise "1.4 km"
export function formatDistance(km) {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${km.toFixed(1)} km`;
}
