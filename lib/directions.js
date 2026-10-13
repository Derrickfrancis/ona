// Turns one ranked way into plain, spoken-style steps:
// "Get to X", "Enter <what is called out>", then "Tell them <destination>".
export function buildSteps(option, stopsById, routesById) {
  const steps = [];
  const firstLeg = option.legs[0];

  steps.push({
    kind: "get_to",
    text: `Get to ${stopsById[firstLeg.fromStopId]?.name}`,
    stopId: firstLeg.fromStopId,
  });

  option.legs.forEach((leg, index) => {
    const route = routesById[leg.routeId] || {};
    const callName = route.callName || route.name || "the bus";
    const hint = route.vehicleHint ? ` (${route.vehicleHint})` : "";

    let text;
    if (index === 0) {
      text = `Enter ${callName}${hint}`;
    } else {
      const fromStop = stopsById[leg.fromStopId];
      const fromName = fromStop?.shortName || fromStop?.name;
      const note = route.boardingNote ? `, ${route.boardingNote}` : "";
      text = `Get to ${fromName}${note}, then enter ${callName}${hint}`;
    }

    steps.push({
      kind: "enter",
      text,
      mode: route.mode,
      routeId: leg.routeId,
      fareMin: leg.fareMin,
      fareMax: leg.fareMax,
      fareKnown: leg.fareKnown,
      fareEstimated: leg.fareEstimated,
      minutes: leg.minutes,
      minutesKnown: leg.minutesKnown,
    });
  });

  const lastLeg = option.legs[option.legs.length - 1];
  const destination = stopsById[lastLeg.toStopId];
  steps.push({
    kind: "tell_them",
    text: destination?.tellThem || destination?.name || "",
  });

  return steps;
}
