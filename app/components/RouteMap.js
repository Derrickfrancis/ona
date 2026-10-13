"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { colorForWay } from "./Waycolors";

const MODE_LINE_COLORS = {
  danfo: "#BA7517",
  brt: "#185FA5",
  keke: "#993556",
};

function makeDot(size, fill, border) {
  const el = document.createElement("div");
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${fill};border:2px solid ${border};box-shadow:0 1px 3px rgba(0,0,0,0.35);`;
  return el;
}

// Every stop the leg passes through. Falls back to just the two ends
// if the API did not send the full list.
function getLegStops(leg) {
  if (leg.stopsAlong && leg.stopsAlong.length > 1) return leg.stopsAlong;
  return [
    {
      id: leg.fromStopId,
      name: leg.fromStopName,
      lat: leg.fromLat,
      lng: leg.fromLng,
    },
    { id: leg.toStopId, name: leg.toStopName, lat: leg.toLat, lng: leg.toLng },
  ];
}

function hasCoordinates(stop) {
  return Number.isFinite(stop.lat) && Number.isFinite(stop.lng);
}

function stopsForWay(wayLegs) {
  return wayLegs
    .map(getLegStops)
    .flatMap((stops, i) => (i === 0 ? stops : stops.slice(1)))
    .filter(hasCoordinates);
}

function addPopupMarker(map, element, stop) {
  new maplibregl.Marker({ element })
    .setLngLat([stop.lng, stop.lat])
    .setPopup(
      new maplibregl.Popup({ offset: 14, closeButton: false }).setText(
        stop.name || "Stop",
      ),
    )
    .addTo(map);
}

// Pass `options` (every way) with `activeIndex`, or `legs` for a single way.
export default function RouteMap({ legs, options, activeIndex = 0 }) {
  const mapContainer = useRef(null);

  useEffect(() => {
    const ways =
      options && options.length > 0
        ? options.map((opt) => opt.legs)
        : legs && legs.length > 0
          ? [legs]
          : [];
    if (ways.length === 0) return;

    const multi = ways.length > 1;
    const activeWay = Math.min(activeIndex, ways.length - 1);
    const wayStops = ways.map(stopsForWay);
    const activeStops = wayStops[activeWay];
    if (!activeStops || activeStops.length < 2) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [activeStops[0].lng, activeStops[0].lat],
      zoom: 12,
    });

    map.on("load", () => {
      // Other ways first, the chosen way last so it sits on top
      const order = ways
        .map((wayLegs, index) => index)
        .filter((index) => index !== activeWay)
        .concat(activeWay);

      order.forEach((wayIndex) => {
        const isActive = wayIndex === activeWay;
        ways[wayIndex].forEach((leg, legIndex) => {
          const coordinates = getLegStops(leg)
            .filter(hasCoordinates)
            .map((stop) => [stop.lng, stop.lat]);
          if (coordinates.length < 2) return;

          const sourceId = `way-${wayIndex}-leg-${legIndex}`;
          map.addSource(sourceId, {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: { type: "LineString", coordinates },
            },
          });
          map.addLayer({
            id: `${sourceId}-line`,
            type: "line",
            source: sourceId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
              "line-color": multi
                ? colorForWay(wayIndex)
                : MODE_LINE_COLORS[leg.mode] || "#185FA5",
              "line-width": isActive ? 6 : 3,
              "line-opacity": isActive ? 1 : 0.5,
            },
          });
        });
      });
    });

    // Full set of pins for the chosen way
    const activeLegs = ways[activeWay];
    const transferIds = new Set(
      activeLegs.slice(0, -1).map((leg) => leg.toStopId),
    );
    const lastIndex = activeStops.length - 1;

    activeStops.forEach((stop, i) => {
      let element;
      if (i === 0) element = makeDot(20, "#185FA5", "#FFFFFF");
      else if (i === lastIndex) element = makeDot(20, "#A32D2D", "#FFFFFF");
      else if (transferIds.has(stop.id))
        element = makeDot(16, "#5F5E5A", "#FFFFFF");
      else element = makeDot(10, "#FFFFFF", "#185FA5");
      addPopupMarker(map, element, stop);
    });

    // Just the change-over point for the other ways, in their colour
    ways.forEach((wayLegs, wayIndex) => {
      if (wayIndex === activeWay) return;
      wayLegs.slice(0, -1).forEach((leg) => {
        const hub = {
          name: leg.toStopName,
          lat: leg.toLat,
          lng: leg.toLng,
        };
        if (!hasCoordinates(hub)) return;
        addPopupMarker(map, makeDot(12, colorForWay(wayIndex), "#FFFFFF"), hub);
      });
    });

    const bounds = new maplibregl.LngLatBounds();
    wayStops.flat().forEach((stop) => bounds.extend([stop.lng, stop.lat]));
    map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 0 });

    return () => {
      map.remove();
    };
  }, [legs, options, activeIndex]);

  return (
    <div
      ref={mapContainer}
      className="w-full rounded-xl overflow-hidden"
      style={{ height: "260px", border: "1px solid var(--border)" }}
    />
  );
}
