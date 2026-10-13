"use client";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const LAGOS_CENTER = [3.3792, 6.5244];

export default function PickMap({
  stops,
  userLocation,
  originId,
  destinationId,
  onPick,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const userMarkerRef = useRef(null);
  const onPickRef = useRef(onPick);

  // Keep the latest callback without rebuilding the markers
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Create the map once
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: LAGOS_CENTER,
      zoom: 10,
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      userMarkerRef.current = null;
    };
  }, []);

  // One tappable marker per stop
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stops || stops.length === 0) return;

    Object.values(markersRef.current).forEach(({ marker }) => marker.remove());
    markersRef.current = {};

    const bounds = new maplibregl.LngLatBounds();

    stops.forEach((stop) => {
      if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) return;

      const element = document.createElement("button");
      element.type = "button";
      element.setAttribute("aria-label", stop.name);
      element.style.cssText =
        "border-radius:50%;border:2px solid #FFFFFF;padding:0;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.4);";
      element.addEventListener("click", () => onPickRef.current(stop.id));

      const marker = new maplibregl.Marker({ element })
        .setLngLat([stop.lng, stop.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 14, closeButton: false }).setText(
            stop.name,
          ),
        )
        .addTo(map);

      markersRef.current[stop.id] = { marker, element };
      bounds.extend([stop.lng, stop.lat]);
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 13, duration: 0 });
    }
  }, [stops]);

  // Colour the chosen origin and destination
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([stopId, { element }]) => {
      const isOrigin = stopId === originId;
      const isDestination = stopId === destinationId;
      const size = isOrigin || isDestination ? 22 : 16;
      element.style.width = `${size}px`;
      element.style.height = `${size}px`;
      element.style.background = isOrigin
        ? "#185FA5"
        : isDestination
          ? "#A32D2D"
          : "#5F5E5A";
    });
  }, [originId, destinationId, stops]);

  // The user's own position
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (!userLocation) return;

    const element = document.createElement("div");
    element.style.cssText =
      "width:14px;height:14px;border-radius:50%;background:#378ADD;border:3px solid #FFFFFF;box-shadow:0 0 0 5px rgba(55,138,221,0.3);";

    userMarkerRef.current = new maplibregl.Marker({ element })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(map);
    map.easeTo({ center: [userLocation.lng, userLocation.lat], zoom: 13 });
  }, [userLocation]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden"
      style={{ height: "300px", border: "1px solid var(--border)" }}
    />
  );
}
