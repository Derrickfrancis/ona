"use client";
import { useState, useEffect } from "react";
import StopAutoComplete from "./StopAutoComplete";
import RouteMap from "./RouteMap";

const MODE_STYLES = {
  danfo: { bg: "var(--orange-bg)", text: "var(--orange-text)" },
  brt: { bg: "var(--blue-bg)", text: "var(--blue-text)" },
  keke: { bg: "var(--pink-bg)", text: "var(--pink-text)" },
};

function ModeChip({ mode }) {
  const style = MODE_STYLES[mode] || {
    bg: "var(--surface-1)",
    text: "var(--text-2)",
  };
  return (
    <span
      className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md mr-1"
      style={{ background: style.bg, color: style.text }}
    >
      {mode ? mode.toUpperCase() : "BUS"}
    </span>
  );
}

function formatNaira(min, max) {
  return min === max ? `₦${min}` : `₦${min}-${max}`;
}

function legTimeText(leg) {
  return leg.minutesKnown === false
    ? "time not confirmed"
    : `${leg.minutes} min`;
}

function legFareText(leg) {
  if (leg.fareKnown === false) return "fare not confirmed";
  const text = formatNaira(leg.fareMin, leg.fareMax);
  return leg.fareEstimated ? `~${text} estimated` : text;
}

export default function CustomRouteBuilder({ stops }) {
  const [startStopId, setStartStopId] = useState("");
  const [legs, setLegs] = useState([]);
  const [optionsState, setOptionsState] = useState({
    stopId: "",
    options: [],
    failed: false,
  });
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedToStopId, setSelectedToStopId] = useState("");
  const [addingLeg, setAddingLeg] = useState(false);
  const [error, setError] = useState("");

  const currentStopId =
    legs.length > 0 ? legs[legs.length - 1].toStopId : startStopId;

  // Load the valid next legs whenever the current stop changes
  useEffect(() => {
    if (!currentStopId) return;

    let cancelled = false;
    fetch(`/api/leg-options?fromStopId=${encodeURIComponent(currentStopId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setOptionsState({
            stopId: currentStopId,
            options: data.options || [],
            failed: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOptionsState({ stopId: currentStopId, options: [], failed: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentStopId]);

  const optionsReady = optionsState.stopId === currentStopId;
  const loadingOptions = Boolean(currentStopId) && !optionsReady;
  const legOptions = optionsReady ? optionsState.options : [];
  const optionsFailed = optionsReady && optionsState.failed;

  const selectedRoute = legOptions.find(
    (opt) => opt.routeId === selectedRouteId,
  );
  const startStop = stops.find((stop) => stop.id === startStopId);

  async function handleAddLeg() {
    if (!selectedRouteId || !selectedToStopId) return;
    setAddingLeg(true);
    setError("");
    try {
      const res = await fetch(
        `/api/leg-detail?routeId=${encodeURIComponent(selectedRouteId)}&fromStopId=${encodeURIComponent(currentStopId)}&toStopId=${encodeURIComponent(selectedToStopId)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't add that leg.");
        return;
      }
      setLegs((previous) => [...previous, data]);
      setSelectedRouteId("");
      setSelectedToStopId("");
    } catch (err) {
      setError("Couldn't add that leg. Check your connection.");
    } finally {
      setAddingLeg(false);
    }
  }

  function handleRemoveLastLeg() {
    setLegs((previous) => previous.slice(0, -1));
    setSelectedRouteId("");
    setSelectedToStopId("");
    setError("");
  }

  function handleReset() {
    setStartStopId("");
    setLegs([]);
    setSelectedRouteId("");
    setSelectedToStopId("");
    setError("");
  }

  const totalMinutes = legs.reduce((sum, leg) => sum + leg.minutes, 0);
  const totalFareMin = legs.reduce((sum, leg) => sum + leg.fareMin, 0);
  const totalFareMax = legs.reduce((sum, leg) => sum + leg.fareMax, 0);
  const allTimesKnown = legs.every((leg) => leg.minutesKnown !== false);
  const allFaresKnown = legs.every((leg) => leg.fareKnown !== false);
  const anyEstimated = legs.some((leg) => leg.fareEstimated);

  let totalFareText = "fare not confirmed";
  if (allFaresKnown) {
    totalFareText = `${anyEstimated ? "~" : ""}${formatNaira(totalFareMin, totalFareMax)}`;
  } else if (totalFareMax > 0) {
    totalFareText = `${formatNaira(totalFareMin, totalFareMax)} so far`;
  }

  return (
    <div
      className="rounded-xl p-3 sm:p-4"
      style={{
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <p
        className="text-sm font-semibold mb-3"
        style={{ color: "var(--text)" }}
      >
        Your route
      </p>

      {!startStopId && (
        <StopAutoComplete
          label="Start at"
          stops={stops}
          value={startStopId}
          onChange={setStartStopId}
          placeholder="Type a stop name"
        />
      )}

      {legs.map((leg, index) => (
        <div key={index} className="flex gap-2 mb-2 items-start">
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-medium wrap-break-word"
              style={{ color: "var(--text)" }}
            >
              {leg.fromStopName} &rarr; {leg.toStopName}
            </p>
            <ModeChip mode={leg.mode} />
            <span className="text-xs" style={{ color: "var(--text-2)" }}>
              {legTimeText(leg)} &middot; {legFareText(leg)}
            </span>
          </div>
        </div>
      ))}

      {legs.length > 0 && (
        <div className="mb-3">
          <RouteMap legs={legs} />
        </div>
      )}

      {startStopId && (
        <div className="mt-2">
          {legs.length === 0 && (
            <p className="text-xs mb-2" style={{ color: "var(--text-3)" }}>
              Starting at {startStop?.name}
            </p>
          )}

          {loadingOptions && (
            <p className="text-xs mb-2" style={{ color: "var(--text-2)" }}>
              Loading options...
            </p>
          )}

          {optionsFailed && (
            <p className="text-xs mb-2" style={{ color: "var(--danger-text)" }}>
              Couldn&apos;t load options. Check your connection.
            </p>
          )}

          {!loadingOptions && !optionsFailed && legOptions.length === 0 && (
            <p className="text-xs mb-2" style={{ color: "var(--text-3)" }}>
              No further routes found from here.
            </p>
          )}

          {!loadingOptions && legOptions.length > 0 && (
            <div className="mb-2">
              <select
                value={selectedRouteId}
                onChange={(e) => {
                  setSelectedRouteId(e.target.value);
                  setSelectedToStopId("");
                }}
                aria-label="Choose a route"
                className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              >
                <option value="">Choose a route</option>
                {legOptions.map((opt) => (
                  <option key={opt.routeId} value={opt.routeId}>
                    {opt.callName ? `Enter ${opt.callName}` : opt.routeName}{" "}
                    &middot; {opt.mode ? opt.mode.toUpperCase() : "BUS"}
                  </option>
                ))}
              </select>

              {selectedRoute && (
                <select
                  value={selectedToStopId}
                  onChange={(e) => setSelectedToStopId(e.target.value)}
                  aria-label="Ride to"
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                >
                  <option value="">Ride to...</option>
                  {selectedRoute.destinations.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={handleAddLeg}
                disabled={!selectedRouteId || !selectedToStopId || addingLeg}
                className="w-full rounded-lg py-2 text-sm font-medium disabled:opacity-50"
                style={{ background: "var(--accent-fill)", color: "#FFFFFF" }}
              >
                {addingLeg ? "Adding..." : "Add this leg"}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p
          className="text-xs rounded-lg px-3 py-2 mb-2 border"
          style={{
            color: "var(--danger-text)",
            background: "var(--danger-bg)",
            borderColor: "var(--danger-border)",
          }}
        >
          {error}
        </p>
      )}

      {legs.length > 0 && (
        <div
          className="border-t pt-2 mt-2"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex justify-between gap-2 text-sm mb-2">
            <span style={{ color: "var(--text-2)" }}>Total so far</span>
            <span
              className="font-semibold text-right wrap-break-word"
              style={{ color: "var(--text)" }}
            >
              {allTimesKnown ? `${totalMinutes} min` : "time not confirmed"}{" "}
              &middot; {totalFareText}
            </span>
          </div>
          <button
            onClick={handleRemoveLastLeg}
            className="text-xs underline mr-4"
            style={{ color: "var(--text-2)" }}
          >
            Remove last leg
          </button>
        </div>
      )}

      {startStopId && (
        <button
          onClick={handleReset}
          className="text-xs underline mt-2"
          style={{ color: "var(--text-2)" }}
        >
          Start over
        </button>
      )}
    </div>
  );
}
