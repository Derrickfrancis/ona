"use client";
import { useState, useEffect } from "react";
import StopAutoComplete from "./components/StopAutoComplete";
import CustomRouteBuilder from "./components/CustomRouteBuilder";
import RouteMap from "./components/RouteMap";
import PickMap from "./components/PickMap";
import DirectionsCard from "./components/DirectionsCard";
import { colorForWay } from "./components/Waycolors";
import { findNearbyStops, formatDistance } from "@/lib/geo";

// Only stops this close (in kilometres) count as "near you"
const NEARBY_RADIUS_KM = 1;

function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle dark mode"
      className="w-9 h-9 flex items-center justify-center rounded-full border shrink-0"
      style={{ borderColor: "var(--border-strong)", color: "var(--text)" }}
    >
      {theme === "dark" ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

function SearchModeToggle({ mode, setMode }) {
  return (
    <div className="flex gap-2 mb-5">
      <button
        onClick={() => setMode("search")}
        className="text-sm px-3 py-1.5 rounded-full font-medium"
        style={{
          background:
            mode === "search" ? "var(--accent-fill)" : "var(--surface-1)",
          color: mode === "search" ? "#FFFFFF" : "var(--text-2)",
        }}
      >
        Search
      </button>
      <button
        onClick={() => setMode("build")}
        className="text-sm px-3 py-1.5 rounded-full font-medium"
        style={{
          background:
            mode === "build" ? "var(--accent-fill)" : "var(--surface-1)",
          color: mode === "build" ? "#FFFFFF" : "var(--text-2)",
        }}
      >
        Build your own
      </button>
    </div>
  );
}

// Which end of the trip a tap on the map will set
function PickTargetToggle({ target, setTarget }) {
  const options = [
    { value: "origin", label: "From" },
    { value: "destination", label: "To" },
  ];
  return (
    <div className="flex gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setTarget(option.value)}
          className="text-xs px-3 py-1 rounded-full font-medium"
          style={{
            background:
              target === option.value
                ? "var(--accent-fill)"
                : "var(--surface-1)",
            color: target === option.value ? "#FFFFFF" : "var(--text-2)",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState("search");
  const [theme, setTheme] = useState("light");
  const [stops, setStops] = useState([]);
  const [stopsError, setStopsError] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickTarget, setPickTarget] = useState("origin");
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyOrigins, setNearbyOrigins] = useState([]);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [result, setResult] = useState(null);
  const [activeWay, setActiveWay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/stops")
      .then((res) => res.json())
      .then((data) => setStops(data.stops || []))
      .catch(() =>
        setStopsError("Couldn't load stops. Refresh the page to try again."),
      );
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const current =
      root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    root.setAttribute("data-theme", next);
    localStorage.setItem("ona-theme", next);
  }

  // Choosing a starting stop by hand drops the GPS-based list of nearby stops
  function handleOriginChange(stopId) {
    setOrigin(stopId);
    if (!nearbyOrigins.some((entry) => entry.stop.id === stopId)) {
      setNearbyOrigins([]);
    }
  }

  // Your position stays in this browser. It is never sent to the server;
  // only the IDs of the stops near you are.
  function handleUseMyLocation() {
    setLocationMessage("");

    if (!navigator.geolocation) {
      setLocationMessage("This browser can't share your location.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Landmarks (like a hospital) are places you go to, not places you board
        const boardableStops = stops.filter((stop) => stop.kind !== "landmark");
        const nearby = findNearbyStops(
          latitude,
          longitude,
          boardableStops,
          NEARBY_RADIUS_KM,
          3,
        );

        if (nearby.length > 0) {
          setNearbyOrigins(nearby);
          setOrigin(nearby[0].stop.id);
          setPickTarget("destination");
          const others =
            nearby.length > 1
              ? ` I'll also check ${nearby.length - 1} other stop${nearby.length > 2 ? "s" : ""} near you.`
              : "";
          setLocationMessage(
            `Nearest stop: ${nearby[0].stop.name} (${formatDistance(nearby[0].distanceKm)} away).${others} Now say where you're going.`,
          );
        } else {
          setNearbyOrigins([]);
          setLocationMessage(
            "No stops within 1 km of you yet. Pick your starting stop instead.",
          );
        }
        setLocating(false);
      },
      (geoError) => {
        setLocationMessage(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location permission was denied. You can still pick your start."
            : "Couldn't get your location. Try again, or pick your start.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function handlePickOnMap(stopId) {
    if (pickTarget === "origin") {
      handleOriginChange(stopId);
      setPickTarget("destination");
    } else {
      setDestination(stopId);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setActiveWay(0);

    if (!origin || !destination) {
      setError("Pick both a starting point and a destination.");
      return;
    }

    // With GPS, search from every stop near you, not just the nearest one
    const originIds = nearbyOrigins.some((entry) => entry.stop.id === origin)
      ? nearbyOrigins.map((entry) => entry.stop.id)
      : [origin];

    setLoading(true);
    try {
      const res = await fetch(
        `/api/routes?origins=${originIds.map(encodeURIComponent).join(",")}&destination=${encodeURIComponent(destination)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError("Couldn't load routes. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // How far you are from each way's first stop (known only when you used GPS)
  const startDistances = Object.fromEntries(
    nearbyOrigins.map((entry) => [entry.stop.id, entry.distanceKm]),
  );

  // "Closest to you" only means something when ways start at different stops.
  // Every way that starts at the closest stop gets the badge.
  let closestStartId = null;
  if (result && result.options) {
    const distinctStarts = new Set(
      result.options.map((opt) => opt.startStopId),
    );
    if (distinctStarts.size > 1) {
      let shortest = Infinity;
      distinctStarts.forEach((startStopId) => {
        const distance = startDistances[startStopId];
        if (distance !== undefined && distance < shortest) {
          shortest = distance;
          closestStartId = startStopId;
        }
      });
    }
  }

  return (
    <main className="min-h-screen w-full" style={{ background: "var(--bg)" }}>
      <div className="max-w-md sm:max-w-xl md:max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <h1
              className="text-xl sm:text-2xl font-semibold truncate"
              style={{ color: "var(--text)" }}
            >
              Where to?
            </h1>
            <p
              className="text-sm sm:text-base mb-5 sm:mb-6"
              style={{ color: "var(--text-2)" }}
            >
              Get routes, times and fares
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>

        <SearchModeToggle mode={mode} setMode={setMode} />

        {mode === "search" && (
          <>
            <form onSubmit={handleSearch} className="mb-4">
              <div className="flex items-end gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <StopAutoComplete
                    label="Where you dey?"
                    stops={stops}
                    value={origin}
                    onChange={handleOriginChange}
                    placeholder="Type a stop name"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locating || stops.length === 0}
                  aria-label="Use my current location"
                  className="flex items-center gap-1.5 text-xs px-3 py-2.5 rounded-lg border font-medium shrink-0 disabled:opacity-50"
                  style={{
                    borderColor: "var(--border-strong)",
                    color: "var(--text)",
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    <circle cx="12" cy="12" r="8" />
                  </svg>
                  {locating ? "Locating..." : "My location"}
                </button>
              </div>

              {locationMessage && (
                <p
                  className="text-xs mb-3 wrap-break-word"
                  style={{ color: "var(--text-2)" }}
                >
                  {locationMessage}
                </p>
              )}

              <div className="mb-4">
                <StopAutoComplete
                  label="Where you dey go?"
                  stops={stops}
                  value={destination}
                  onChange={setDestination}
                  placeholder="Type a place or stop, e.g. National Orthopaedic Hospital"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto sm:px-10 rounded-lg py-2.5 text-sm sm:text-base font-medium"
                style={{ background: "var(--accent-fill)", color: "#FFFFFF" }}
              >
                Find routes
              </button>
            </form>

            <details className="mb-6">
              <summary
                className="text-xs cursor-pointer select-none mb-2"
                style={{ color: "var(--accent-fill)" }}
              >
                Pick stops on the map instead
              </summary>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs" style={{ color: "var(--text-3)" }}>
                  Tap a stop to set
                </span>
                <PickTargetToggle
                  target={pickTarget}
                  setTarget={setPickTarget}
                />
              </div>
              <PickMap
                stops={stops}
                userLocation={userLocation}
                originId={origin}
                destinationId={destination}
                onPick={handlePickOnMap}
              />
              {stopsError && (
                <p
                  className="text-xs mt-2"
                  style={{ color: "var(--danger-text)" }}
                >
                  {stopsError}
                </p>
              )}
            </details>

            {error && (
              <p
                className="text-sm rounded-lg px-3 py-2 mb-4 border wrap-break-word"
                style={{
                  color: "var(--danger-text)",
                  background: "var(--danger-bg)",
                  borderColor: "var(--danger-border)",
                }}
              >
                {error}
              </p>
            )}

            {loading && (
              <div className="flex flex-col items-center py-10">
                <div
                  className="w-8 h-8 rounded-full animate-spin mb-3"
                  style={{
                    border: "3px solid var(--border)",
                    borderTopColor: "var(--accent-fill)",
                  }}
                />
                <p className="text-sm" style={{ color: "var(--text-2)" }}>
                  Finding your routes
                </p>
              </div>
            )}

            {result && result.options && result.options.length === 0 && (
              <div className="text-center py-10 px-2">
                <p
                  className="font-medium mb-1"
                  style={{ color: "var(--text)" }}
                >
                  No routes here yet
                </p>
                <p className="text-sm" style={{ color: "var(--text-2)" }}>
                  This trip isn&apos;t covered yet. Try a different stop.
                </p>
              </div>
            )}

            {result && result.options && result.options.length > 0 && (
              <div>
                <p
                  className="text-sm sm:text-base mb-1 font-medium"
                  style={{ color: "var(--text)" }}
                >
                  {result.options.length === 1
                    ? "1 way to go"
                    : `${result.options.length} ways to go`}
                </p>
                <p
                  className="text-sm mb-3 wrap-break-word"
                  style={{ color: "var(--text-2)" }}
                >
                  {result.bestReason}
                </p>

                <div className="mb-4">
                  <RouteMap options={result.options} activeIndex={activeWay} />
                  {result.options.length > 1 && (
                    <p
                      className="text-xs mt-2"
                      style={{ color: "var(--text-3)" }}
                    >
                      Tap a way below to see it highlighted on the map.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.options.map((opt, index) => (
                    <DirectionsCard
                      key={index}
                      option={opt}
                      index={index}
                      color={colorForWay(index)}
                      active={index === activeWay}
                      onSelect={setActiveWay}
                      startDistanceKm={startDistances[opt.startStopId]}
                      isClosest={opt.startStopId === closestStartId}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {mode === "build" && <CustomRouteBuilder stops={stops} />}
      </div>
    </main>
  );
}
