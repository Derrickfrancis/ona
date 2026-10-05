"use client";
import { useState } from "react";

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
  const displayValue =
    typedQuery !== null ? typedQuery : selectedStop ? selectedStop.name : "";

  const filtered = (typedQuery ?? "").trim()
    ? stops.filter((stop) =>
        stop.name.toLowerCase().includes(typedQuery.toLowerCase()),
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
              className="px-3 py-2 text-sm cursor-pointer"
              style={{ color: "var(--text)" }}
            >
              {stop.name}
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
