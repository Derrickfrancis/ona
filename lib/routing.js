import { getRouteStops, getSegments } from "./data";

// All route_stops entries for one route, in stop order
export function getStopsForRoute(routeId) {
  return getRouteStops()
    .filter((entry) => entry.routeId === routeId)
    .sort((a, b) => a.sequence - b.sequence);
}

// Every routeId that serves a given stop
export function getRoutesServingStop(stopId) {
  return getRouteStops()
    .filter((entry) => entry.stopId === stopId)
    .map((entry) => entry.routeId);
}

// Routes where stopA comes before stopB, in the right direction
export function findDirectRoutes(originStopId, destinationStopId) {
  const originRoutes = new Set(getRoutesServingStop(originStopId));
  const destinationRoutes = new Set(getRoutesServingStop(destinationStopId));

  const sharedRoutes = [...originRoutes].filter((routeId) =>
    destinationRoutes.has(routeId),
  );

  return sharedRoutes.filter((routeId) => {
    const stops = getStopsForRoute(routeId);
    const originSeq = stops.find(
      (stop) => stop.stopId === originStopId,
    )?.sequence;
    const destSeq = stops.find(
      (stop) => stop.stopId === destinationStopId,
    )?.sequence;
    return (
      originSeq !== undefined && destSeq !== undefined && originSeq < destSeq
    );
  });
}

export function getLegDetails(routeId, fromStopId, toStopId) {
  const stops = getStopsForRoute(routeId);
  const fromSeq = stops.find((stop) => stop.stopId === fromStopId)?.sequence;
  const toSeq = stops.find((stop) => stop.stopId === toStopId)?.sequence;
  if (fromSeq === undefined || toSeq === undefined || fromSeq >= toSeq)
    return null;

  const stopsInRange = stops
    .filter((stop) => stop.sequence >= fromSeq && stop.sequence <= toSeq)
    .sort((a, b) => a.sequence - b.sequence);

  const segments = getSegments();
  let minutes = 0,
    minutesPeak = 0,
    fareMin = 0,
    fareMax = 0;

  for (let i = 0; i < stopsInRange.length - 1; i++) {
    const segment = segments.find(
      (seg) =>
        seg.routeId === routeId &&
        seg.fromStop === stopsInRange[i].stopId &&
        seg.toStop === stopsInRange[i + 1].stopId,
    );
    if (!segment) return null;
    minutes += segment.avgMinutes;
    minutesPeak += segment.avgMinutesPeak;
    fareMin += segment.fareMin;
    fareMax += segment.fareMax;
  }

  return { minutes, minutesPeak, fareMin, fareMax };
}

export function findTransferOptions(originStopId, destinationStopId) {
  const results = [];
  const originRoutes = getRoutesServingStop(originStopId);

  for (const route1 of originRoutes) {
    const stops1 = getStopsForRoute(route1);
    const originSeq = stops1.find(
      (stop) => stop.stopId === originStopId,
    )?.sequence;
    if (originSeq === undefined) continue;

    const hubCandidates = stops1.filter(
      (stop) => stop.sequence > originSeq && stop.stopId !== destinationStopId,
    );

    for (const hub of hubCandidates) {
      const routesAtHub = getRoutesServingStop(hub.stopId).filter(
        (route) => route !== route1,
      );

      for (const route2 of routesAtHub) {
        const stops2 = getStopsForRoute(route2);
        const hubSeq2 = stops2.find(
          (stop) => stop.stopId === hub.stopId,
        )?.sequence;
        const destSeq2 = stops2.find(
          (stop) => stop.stopId === destinationStopId,
        )?.sequence;

        if (
          hubSeq2 !== undefined &&
          destSeq2 !== undefined &&
          hubSeq2 < destSeq2
        ) {
          results.push({ route1, hubStopId: hub.stopId, route2 });
        }
      }
    }
  }

  return results;
}

export function searchRoutes(originStopId, destinationStopId) {
  const options = [];

  // Direct routes
  for (const routeId of findDirectRoutes(originStopId, destinationStopId)) {
    const leg = getLegDetails(routeId, originStopId, destinationStopId);
    if (!leg) continue;
    options.push({
      transfers: 0,
      legs: [
        {
          routeId,
          fromStopId: originStopId,
          toStopId: destinationStopId,
          ...leg,
        },
      ],
      totalMinutes: leg.minutes,
      totalMinutesPeak: leg.minutesPeak,
      fareMin: leg.fareMin,
      fareMax: leg.fareMax,
    });
  }

  // One-transfer routes
  for (const t of findTransferOptions(originStopId, destinationStopId)) {
    const leg1 = getLegDetails(t.route1, originStopId, t.hubStopId);
    const leg2 = getLegDetails(t.route2, t.hubStopId, destinationStopId);
    if (!leg1 || !leg2) continue;
    options.push({
      transfers: 1,
      legs: [
        {
          routeId: t.route1,
          fromStopId: originStopId,
          toStopId: t.hubStopId,
          ...leg1,
        },
        {
          routeId: t.route2,
          fromStopId: t.hubStopId,
          toStopId: destinationStopId,
          ...leg2,
        },
      ],
      totalMinutes: leg1.minutes + leg2.minutes,
      totalMinutesPeak: leg1.minutesPeak + leg2.minutesPeak,
      fareMin: leg1.fareMin + leg2.fareMin,
      fareMax: leg1.fareMax + leg2.fareMax,
    });
  }

  return options;
}
// Rough common currency: treat ~10 naira as "worth" 1 minute, and each
// transfer as a 10-minute inconvenience. These numbers are a starting
// guess — easy to tune later once you see real user behavior.
const NAIRA_PER_MINUTE = 10;
const TRANSFER_PENALTY_MINUTES = 10;

export function scoreOptions(options) {
  const scored = options.map((opt) => {
    const avgFare = (opt.fareMin + opt.fareMax) / 2;
    const score =
      opt.totalMinutes +
      avgFare / NAIRA_PER_MINUTE +
      opt.transfers * TRANSFER_PENALTY_MINUTES;
    return { ...opt, avgFare, score };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored.map((opt, i) => ({ ...opt, isBest: i === 0 }));
}

export function explainBest(rankedOptions) {
  if (rankedOptions.length === 0) return null;
  const best = rankedOptions[0];
  const runnerUp = rankedOptions[1];

  if (!runnerUp) {
    return `${best.transfers === 0 ? "Direct route" : `${best.transfers} transfer`}, ${best.totalMinutes} min, ₦${best.fareMin}-${best.fareMax}.`;
  }

  const minutesDiff = runnerUp.totalMinutes - best.totalMinutes;
  const fareDiff = Math.round(runnerUp.avgFare - best.avgFare);

  if (fareDiff > 0 && minutesDiff >= 0) {
    return `Cheapest option, and no slower than the alternatives.`;
  }
  if (minutesDiff > 0 && fareDiff <= 0) {
    return `Fastest option, for about the same cost.`;
  }
  if (fareDiff > 0) {
    return `Saves about ₦${fareDiff} versus the next option, but is ${Math.abs(minutesDiff)} min ${minutesDiff < 0 ? "slower" : "faster"}.`;
  }
  return `Best overall balance of time, cost and transfers among the routes found.`;
}

export function rankRoutes(originStopId, destinationStopId) {
  const options = searchRoutes(originStopId, destinationStopId);
  const ranked = scoreOptions(options);
  const reason = explainBest(ranked);
  return { options: ranked, bestReason: reason };
}
// For a given stop, every route that serves it, and every stop reachable
// further along that route (i.e. valid next steps for a leg starting here)
export function getLegOptionsFrom(fromStopId) {
  const routeIds = getRoutesServingStop(fromStopId);
  const options = [];

  for (const routeId of routeIds) {
    const stops = getStopsForRoute(routeId);
    const fromSeq = stops.find((stop) => stop.stopId === fromStopId)?.sequence;
    if (fromSeq === undefined) continue;

    const destinations = stops.filter((stop) => stop.sequence > fromSeq);
    if (destinations.length === 0) continue;

    options.push({
      routeId,
      destinations: destinations.map((stop) => stop.stopId),
    });
  }

  return options;
}
