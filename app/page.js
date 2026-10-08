"use client";
import { useState } from "react";
import StopAutoComplete from "./components/StopAutoComplete";
import CustomRouteBuilder from "./components/CustomRouteBuilder";
import RouteMap from "./components/RouteMap";

const STOPS = [
  { id: "stop_isolo_market", name: "Isolo Market" },
  { id: "stop_oshodi_terminal", name: "Oshodi Bus Terminal" },
  { id: "stop_ikeja_along", name: "Ikeja Along" },
  { id: "stop_berger", name: "Berger" },
  { id: "stop_obalende", name: "Obalende" },
  { id: "stop_abule_egba", name: "Abule Egba" },
  { id: "stop_apapa", name: "Apapa" },
];

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
      className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md mr-1 mb-1"
      style={{ background: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
}

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

export default function Home() {
  const [mode, setMode] = useState("search");
  const [theme, setTheme] = useState("light");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ona-theme", next);
  }

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!origin || !destination) {
      setError("Pick both a starting point and a destination.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/routes?origin=${origin}&destination=${destination}`,
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
            <form onSubmit={handleSearch} className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <StopAutoComplete
                  label="Where you dey?"
                  stops={STOPS}
                  value={origin}
                  onChange={setOrigin}
                  placeholder="Type a stop name"
                />
                <StopAutoComplete
                  label="Where you dey go?"
                  stops={STOPS}
                  value={destination}
                  onChange={setDestination}
                  placeholder="Type a stop name"
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
                  className="text-sm sm:text-base mb-3 wrap-break-word"
                  style={{ color: "var(--text-2)" }}
                >
                  {result.bestReason}
                </p>
                {result.options.find((opt) => opt.isBest) && (
                  <div className="mb-4">
                    <RouteMap
                      legs={result.options.find((opt) => opt.isBest).legs}
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.options.map((opt, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-3 sm:p-4 min-w-0"
                      style={{
                        border: opt.isBest
                          ? "2px solid var(--accent-fill)"
                          : "1px solid var(--border)",
                        background: "var(--surface)",
                      }}
                    >
                      <div className="flex justify-between items-center gap-2 mb-2">
                        {opt.isBest ? (
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                            style={{
                              background: "var(--accent-bg)",
                              color: "var(--accent-text)",
                            }}
                          >
                            Best match
                          </span>
                        ) : (
                          <span />
                        )}
                        <span
                          className="font-semibold text-sm sm:text-base whitespace-nowrap"
                          style={{ color: "var(--text)" }}
                        >
                          ₦{opt.fareMin}-{opt.fareMax}
                        </span>
                      </div>
                      <div className="mb-1 flex flex-wrap">
                        {opt.legs.map((leg, j) => (
                          <ModeChip key={j} mode={leg.mode} />
                        ))}
                      </div>
                      <p
                        className="text-xs sm:text-sm"
                        style={{ color: "var(--text-2)" }}
                      >
                        {opt.totalMinutes} min · {opt.transfers} transfer
                        {opt.transfers !== 1 ? "s" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {mode === "build" && <CustomRouteBuilder stops={STOPS} />}
      </div>
    </main>
  );
}
