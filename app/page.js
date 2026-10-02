"use client";
import { useState } from "react";

const STOPS = [
  { id: "stop_isolo_market", name: "Isolo Market" },
  { id: "stop_oshodi_terminal", name: "Oshodi Bus Terminal" },
  { id: "stop_ikeja_along", name: "Ikeja Along" },
  { id: "stop_berger", name: "Berger" },
  { id: "stop_obalende", name: "Obalende" },
  { id: "stop_abule_egba", name: "Abule Egba" },
  { id: "stop_apapa", name: "Apapa" },
];

export default function Home() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      setResult(data);
    } catch (err) {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 420,
        margin: "40px auto",
        padding: 16,
        fontFamily: "sans-serif",
      }}
    >
      <h1>Where to?</h1>
      <form onSubmit={handleSearch}>
        <div style={{ marginBottom: 12 }}>
          <label>From</label>
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8 }}
          >
            <option value="">Select a stop</option>
            {STOPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>To</label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8 }}
          >
            <option value="">Select a stop</option>
            {STOPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" style={{ width: "100%", padding: 10 }}>
          Find routes
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading && <p>Finding your routes...</p>}

      {result && result.options.length === 0 && (
        <p>No routes found between those stops yet.</p>
      )}

      {result && result.options.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <p>
            <strong>{result.bestReason}</strong>
          </p>
          {result.options.map((opt, i) => (
            <div
              key={i}
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
              }}
            >
              {opt.isBest && (
                <span
                  style={{
                    background: "#e6f1fb",
                    color: "#0c447c",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                >
                  Best match
                </span>
              )}
              <p>
                {opt.transfers} transfer{opt.transfers !== 1 ? "s" : ""} ·{" "}
                {opt.totalMinutes} min
              </p>
              <p>
                ₦{opt.fareMin}-{opt.fareMax}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
