import { getRouteStops, getSegments, getStops, getRoutes } from "./data";

// Rough common currency: treat ~10 naira as "worth" 1 minute, and each
// transfer as a 10-minute inconvenience. Starting guesses, easy to tune.
const NAIRA_PER_MINUTE = 10;
const TRANSFER_PENALTY_MINUTES = 10;
// Added to the score for every missing fare or time, so a way with more
// confirmed information ranks a little higher than one we know less about.
const UNKNOWN_PENALTY = 15;

// Rule of thumb for informal rides (danfo, keke, korope, bus). Used ONLY when
// a leg has a known drive time but no known fare: about N200 (up to N300)
// for every 5 minutes of driving, rounded up, so N200 is the minimum.
const FARE_BLOCK_MINUTES = 5;
const FARE_PER_BLOCK_MIN = 200;
const FARE_PER_BLOCK_MAX = 300;

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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

// Routes where the origin comes before the destination, in the right direction
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

// Every stop from one point to another along a route, in order
export function getStopIdsBetween(routeId, fromStopId, toStopId) {
  const stops = getStopsForRoute(routeId);
  const fromSeq = stops.find((stop) => stop.stopId === fromStopId)?.sequence;
  const toSeq = stops.find((stop) => stop.stopId === toStopId)?.sequence;
  if (fromSeq === undefined || toSeq === undefined || fromSeq >= toSeq) {
    return [];
  }

  return stops
    .filter((stop) => stop.sequence >= fromSeq && stop.sequence <= toSeq)
    .map((stop) => stop.stopId);
}

// Time and fare for one leg. A missing time or fare is flagged as unknown and
// never silently invented. The one exception is an informal ride with a known
// drive time but no fare: it gets an estimate, flagged with fareEstimated.
export function getLegDetails(routeId, fromStopId, toStopId) {
  const stopIds = getStopIdsBetween(routeId, fromStopId, toStopId);
  if (stopIds.length < 2) return null;

  const route = getRoutes().find((entry) => entry.id === routeId);
  const isInformal = route?.modeTier === "informal";

  const segments = getSegments();
  let minutes = 0;
  let minutesPeak = 0;
  let fareMin = 0;
  let fareMax = 0;
  let minutesKnown = true;
  let fareKnown = true;
  let fareEstimated = false;
  let hasUnpriced = false;
  let canEstimate = true;
  let unpricedMinutes = 0;

  for (let i = 0; i < stopIds.length - 1; i++) {
    const segment = segments.find(
      (seg) =>
        seg.routeId === routeId &&
        seg.fromStop === stopIds[i] &&
        seg.toStop === stopIds[i + 1],
    );
    if (!segment) return null;

    if (segment.avgMinutes == null) {
      minutesKnown = false;
    } else {
      minutes += segment.avgMinutes;
      minutesPeak += segment.avgMinutesPeak ?? segment.avgMinutes;
    }

    if (segment.fareMin == null || segment.fareMax == null) {
      hasUnpriced = true;
      if (segment.avgMinutes == null) canEstimate = false;
      else unpricedMinutes += segment.avgMinutes;
    } else {
      fareMin += segment.fareMin;
      fareMax += segment.fareMax;
    }
  }

  if (hasUnpriced) {
    if (isInformal && canEstimate && unpricedMinutes > 0) {
      const blocks = Math.ceil(unpricedMinutes / FARE_BLOCK_MINUTES);
      fareMin += blocks * FARE_PER_BLOCK_MIN;
      fareMax += blocks * FARE_PER_BLOCK_MAX;
      fareEstimated = true;
    } else {
      fareKnown = false;
    }
  }

  return {
    minutes,
    minutesPeak,
    fareMin,
    fareMax,
    minutesKnown,
    fareKnown,
    fareEstimated,
  };
}

// Routes that reach the destination through exactly one shared stop
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

// For a given stop, every route that serves it, and every stop reachable
// further along that route (the valid next steps for a leg starting here)
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

function combineLegs(legs, via) {
  return {
    transfers: legs.length - 1,
    legs,
    startStopId: legs[0].fromStopId,
    via,
    totalMinutes: legs.reduce((total, leg) => total + leg.minutes, 0),
    totalMinutesPeak: legs.reduce((total, leg) => total + leg.minutesPeak, 0),
    minutesKnown: legs.every((leg) => leg.minutesKnown),
    fareMin: legs.reduce((total, leg) => total + leg.fareMin, 0),
    fareMax: legs.reduce((total, leg) => total + leg.fareMax, 0),
    fareKnown: legs.every((leg) => leg.fareKnown),
    fareEstimated: legs.some((leg) => leg.fareEstimated),
  };
}

export function searchRoutes(originStopId, destinationStopId) {
  const stopNames = Object.fromEntries(
    getStops().map((stop) => [stop.id, stop.shortName || stop.name]),
  );
  const options = [];

  // Direct routes
  for (const routeId of findDirectRoutes(originStopId, destinationStopId)) {
    const details = getLegDetails(routeId, originStopId, destinationStopId);
    if (!details) continue;
    options.push(
      combineLegs(
        [
          {
            routeId,
            fromStopId: originStopId,
            toStopId: destinationStopId,
            ...details,
          },
        ],
        null,
      ),
    );
  }

  // One-transfer routes
  for (const transfer of findTransferOptions(originStopId, destinationStopId)) {
    const firstDetails = getLegDetails(
      transfer.route1,
      originStopId,
      transfer.hubStopId,
    );
    const secondDetails = getLegDetails(
      transfer.route2,
      transfer.hubStopId,
      destinationStopId,
    );
    if (!firstDetails || !secondDetails) continue;

    options.push(
      combineLegs(
        [
          {
            routeId: transfer.route1,
            fromStopId: originStopId,
            toStopId: transfer.hubStopId,
            ...firstDetails,
          },
          {
            routeId: transfer.route2,
            fromStopId: transfer.hubStopId,
            toStopId: destinationStopId,
            ...secondDetails,
          },
        ],
        stopNames[transfer.hubStopId] || null,
      ),
    );
  }

  return options;
}

export function scoreOptions(options) {
  // Missing values are replaced by the average of the known ones, only for
  // scoring, so a missing fare can't make a way look artificially cheap
  const fallbackFare = average(
    options
      .filter((opt) => opt.fareKnown)
      .map((opt) => (opt.fareMin + opt.fareMax) / 2),
  );
  const fallbackMinutes = average(
    options.filter((opt) => opt.minutesKnown).map((opt) => opt.totalMinutes),
  );

  const scored = options.map((opt) => {
    const avgFare = opt.fareKnown ? (opt.fareMin + opt.fareMax) / 2 : null;
    const minutesForScore = opt.minutesKnown
      ? opt.totalMinutes
      : fallbackMinutes;
    const fareForScore = avgFare ?? fallbackFare;
    const unknownCount = (opt.fareKnown ? 0 : 1) + (opt.minutesKnown ? 0 : 1);

    const score =
      minutesForScore +
      fareForScore / NAIRA_PER_MINUTE +
      opt.transfers * TRANSFER_PENALTY_MINUTES +
      unknownCount * UNKNOWN_PENALTY;

    return { ...opt, avgFare, score };
  });

  scored.sort((a, b) => a.score - b.score);

  // "Cheapest" and "fastest" only mean something when at least two ways
  // have that information confirmed
  const withFare = scored.filter((opt) => opt.fareKnown);
  const withMinutes = scored.filter((opt) => opt.minutesKnown);
  const cheapest =
    withFare.length >= 2
      ? withFare.reduce((low, opt) => (opt.avgFare < low.avgFare ? opt : low))
      : null;
  const fastest =
    withMinutes.length >= 2
      ? withMinutes.reduce((low, opt) =>
          opt.totalMinutes < low.totalMinutes ? opt : low,
        )
      : null;

  return scored.map((opt, index) => ({
    ...opt,
    isBest: index === 0,
    isCheapest: cheapest !== null && opt === cheapest,
    isFastest: fastest !== null && opt === fastest,
  }));
}

export function explainBest(rankedOptions) {
  if (rankedOptions.length === 0) return null;

  const best = rankedOptions[0];
  const rest = rankedOptions.slice(1);
  const count = rankedOptions.length;
  const describe = (opt) =>
    opt.via ? `the way through ${opt.via}` : "the direct way";

  const sentences = [];

  if (count === 1) {
    sentences.push(`Only one way found: ${describe(best)}.`);
  } else {
    if (best.isCheapest && best.isFastest) {
      sentences.push(`Cheapest and fastest of the ${count} ways.`);
    } else if (best.isCheapest) {
      sentences.push(`Cheapest of the ${count} ways.`);
    } else if (best.isFastest) {
      sentences.push(`Fastest of the ${count} ways.`);
    } else if (best.fareKnown && rest.some((opt) => !opt.fareKnown)) {
      sentences.push(
        `${capitalizeFirst(describe(best))} is the only way with every fare confirmed.`,
      );
    } else {
      sentences.push("Best balance of price, time and transfers.");
    }

    const cheapest = rankedOptions.find((opt) => opt.isCheapest);
    if (cheapest && !best.isCheapest) {
      sentences.push(
        best.avgFare !== null
          ? `${capitalizeFirst(describe(cheapest))} is cheaper by about ₦${Math.round(best.avgFare - cheapest.avgFare)}.`
          : `${capitalizeFirst(describe(cheapest))} has the lowest confirmed fare.`,
      );
    }

    const fastest = rankedOptions.find((opt) => opt.isFastest);
    if (fastest && !best.isFastest) {
      sentences.push(
        best.minutesKnown
          ? `${capitalizeFirst(describe(fastest))} is faster by about ${best.totalMinutes - fastest.totalMinutes} min.`
          : `${capitalizeFirst(describe(fastest))} has the shortest confirmed time.`,
      );
    }
  }

  if (rankedOptions.some((opt) => opt.fareEstimated)) {
    sentences.push(
      "Some fares are estimated from drive time, about ₦200-300 for every 5 minutes.",
    );
  }

  if (rankedOptions.some((opt) => !opt.fareKnown || !opt.minutesKnown)) {
    sentences.push(
      "Some fares or times are not confirmed yet, so treat this as a first guess.",
    );
  }

  return sentences.join(" ");
}

// originStopIds can be one stop ID or a list (e.g. several stops near you)
export function rankRoutes(originStopIds, destinationStopId) {
  const origins = Array.isArray(originStopIds)
    ? originStopIds
    : [originStopIds];

  const options = origins
    .filter((originStopId) => originStopId !== destinationStopId)
    .flatMap((originStopId) => searchRoutes(originStopId, destinationStopId));

  const ranked = scoreOptions(options);
  return { options: ranked, bestReason: explainBest(ranked) };
}
