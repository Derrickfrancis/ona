"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function RouteMap({ legs }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!legs || legs.length === 0) return;

    const points = [
      {
        lat: legs[0].fromLat,
        lng: legs[0].fromLng,
        name: legs[0].fromStopName,
      },
      ...legs.map((leg) => ({
        lat: leg.toLat,
        lng: leg.toLng,
        name: leg.toStopName,
      })),
    ];

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [points[0].lng, points[0].lat],
      zoom: 12,
    });
    mapRef.current = map;

    map.on("load", () => {
      const coordinates = points.map((point) => [point.lng, point.lat]);

      map.addSource("route-line", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates },
        },
      });
      map.addLayer({
        id: "route-line-layer",
        type: "line",
        source: "route-line",
        paint: { "line-color": "#185FA5", "line-width": 4 },
      });

      points.forEach((point, i) => {
        const isEndpoint = i === 0 || i === points.length - 1;
        new maplibregl.Marker({ color: isEndpoint ? "#185FA5" : "#5F5E5A" })
          .setLngLat([point.lng, point.lat])
          .setPopup(new maplibregl.Popup({ offset: 20 }).setText(point.name))
          .addTo(map);
      });

      const bounds = coordinates.reduce(
        (box, coord) => box.extend(coord),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
      );
      map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [legs]);

  return (
    <div
      ref={mapContainer}
      className="w-full rounded-xl overflow-hidden"
      style={{ height: "240px", border: "1px solid var(--border)" }}
    />
  );
}
