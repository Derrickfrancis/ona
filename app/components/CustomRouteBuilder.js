"use client";
import { useState, useEffect } from "react";
import StopAutoComplete from "./StopAutoComplete";

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
  const label = mode ? mode.toUpperCase() : "UNKNOWN";
  return (
    <span
      className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md mr-1"
      style={{ background: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
}

export default function CustomRouteBuilder({ stops }) {
  const [startStopId, setStartStopId] = useState("");
  const [legs, setLegs] = useState([]);
  const [legOptions, setLegOptions] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedToStopId, setSelectedToStopId] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [addingLeg, setAddingLeg] = useState(false);
  const [error, setError] = useState("");

  const currentStopId =
    legs.length > 0 ? legs[legs.length - 1].toStopId : startStopId;
  const visibleLegOptions = currentStopId ? legOptions : [];

  useEffect(() => {
    if (!currentStopId) {
      return;
    }

    let active = true;

    async function loadLegOptions() {
      setLoadingOptions(true);
      setError("");

      try {
        const res = await fetch(`/api/leg-options?fromStopId=${currentStopId}`);
        const data = await res.json();

        if (!active) return;
        setLegOptions(data.options || []);
      } catch {
        if (!active) return;
        setError("Couldn't load options. Check your connection.");
      } finally {
        if (active) {
          setLoadingOptions(false);
        }
      }
    }

    loadLegOptions();

    return () => {
      active = false;
    };
  }, [currentStopId]);

  const selectedRoute = visibleLegOptions.find(
    (opt) => opt.routeId === selectedRouteId,
  );

  async function handleAddLeg() {
    if (!selectedRouteId || !selectedToStopId) return;
    setAddingLeg(true);
    setError("");
    try {
      const res = await fetch(
        `/api/leg-detail?routeId=${selectedRouteId}&fromStopId=${currentStopId}&toStopId=${selectedToStopId}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't add that leg.");
        return;
      }
      setLegs((prev) => [...prev, data]);
      setSelectedRouteId("");
      setSelectedToStopId("");
    } catch (err) {
      setError("Couldn't add that leg. Check your connection.");
    } finally {
      setAddingLeg(false);
    }
  }

  function handleRemoveLastLeg() {
    setLegs((prev) => prev.slice(0, -1));
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

      {legs.map((leg, i) => (
        <div key={i} className="flex gap-2 mb-2 items-start">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium" style={{ color: "var(--text)" }}>
              {leg.fromStopName} &rarr; {leg.toStopName}
            </p>
            <ModeChip mode={leg.mode} />
            <span className="text-xs" style={{ color: "var(--text-2)" }}>
              {leg.minutes} min &middot; &#8358;{leg.fareMin}-{leg.fareMax}
            </span>
          </div>
        </div>
      ))}

      {startStopId && (
        <div className="mt-2">
          {legs.length === 0 && (
            <p className="text-xs mb-2" style={{ color: "var(--text-3)" }}>
              Starting at {stops.find((stop) => stop.id === startStopId)?.name}
            </p>
          )}

          {loadingOptions && (
            <p className="text-xs mb-2" style={{ color: "var(--text-2)" }}>
              Loading options...
            </p>
          )}

          {!loadingOptions && legOptions.length === 0 && (
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
                    {opt.mode?.toUpperCase()} &middot; {opt.routeName}
                  </option>
                ))}
              </select>

              {selectedRoute && (
                <select
                  value={selectedToStopId}
                  onChange={(e) => setSelectedToStopId(e.target.value)}
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
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: "var(--text-2)" }}>Total so far</span>
            <span className="font-semibold" style={{ color: "var(--text)" }}>
              {totalMinutes} min &middot; &#8358;{totalFareMin}-{totalFareMax}
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
