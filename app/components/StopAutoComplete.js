"use client";
import { useState } from "react";

// Lowercase and drop punctuation so "Orthopaedic," and "orthopaedic" match
function normalize(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9 ]/g, "");
}

export default function StopAutoComplete({
  label,
  stops,
  value,
  onChange,
  placeholder,
}) {
  const [typedQuery, setTypedQuery] = useState(null);
  const [open, setOpen] = useState(false);

  const selectedStop = stops.find((stop) => stop.id === value);
  // A chosen stop always shows its own name, even if it was picked on the map
  const displayValue = selectedStop ? selectedStop.name : (typedQuery ?? "");

  const query = normalize(typedQuery ?? "");
  const filtered = query
    ? stops.filter(
        (stop) =>
          normalize(stop.name).includes(query) ||
          (stop.aliases || []).some((alias) =>
            normalize(alias).includes(query),
          ),
      )
    : stops;

  function handlePick(stop) {
    onChange(stop.id);
    setTypedQuery(null);
    setOpen(false);
  }

  function handleInputChange(e) {
    setTypedQuery(e.target.value);
    setOpen(true);
    if (value) onChange("");
  }

  return (
    <div className="relative min-w-0">
      <label className="block text-xs mb-1" style={{ color: "var(--text-3)" }}>
        {label}
      </label>
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full border rounded-lg px-3 py-2 text-sm sm:text-base"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      />
      {open && filtered.length > 0 && (
        <ul
          className="absolute z-10 w-full mt-1 rounded-lg border shadow-sm max-h-48 overflow-y-auto"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {filtered.map((stop) => (
            <li
              key={stop.id}
              onMouseDown={() => handlePick(stop)}
              className="px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2"
              style={{ color: "var(--text)" }}
            >
              <span className="min-w-0 wrap-break-word">{stop.name}</span>
              {stop.kind === "landmark" && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    background: "var(--surface-1)",
                    color: "var(--text-2)",
                  }}
                >
                  place
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && (
        <div
          className="absolute z-10 w-full mt-1 rounded-lg border px-3 py-2 text-sm"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text-3)",
          }}
        >
          No stops match &quot;{typedQuery}&quot;
        </div>
      )}
    </div>
  );
}
