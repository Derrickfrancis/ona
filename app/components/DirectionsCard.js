"use client";
import { formatDistance } from "@/lib/geo";

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
      className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md"
      style={{ background: style.bg, color: style.text }}
    >
      {mode ? mode.toUpperCase() : "BUS"}
    </span>
  );
}

function formatNaira(min, max) {
  return min === max ? `₦${min}` : `₦${min}-${max}`;
}

function Badge({ label, background, color }) {
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background, color }}
    >
      {label}
    </span>
  );
}

function totalFareText(option) {
  if (option.fareKnown) {
    return option.fareEstimated
      ? `~${formatNaira(option.fareMin, option.fareMax)} (some fares estimated)`
      : formatNaira(option.fareMin, option.fareMax);
  }
  if (option.fareMax > 0) {
    return `${option.fareEstimated ? "~" : ""}${formatNaira(option.fareMin, option.fareMax)} so far, plus fares not confirmed yet`;
  }
  return "Fares not confirmed yet";
}

export default function DirectionsCard({
  option,
  index,
  color,
  active,
  onSelect,
  startDistanceKm,
  isClosest,
}) {
  const steps = option.steps || [];
  const walkSteps = steps.filter((step) => step.kind !== "tell_them");
  const tellThem = steps.find((step) => step.kind === "tell_them");
  const title = option.via
    ? `Way ${index + 1}: through ${option.via}`
    : `Way ${index + 1}: direct`;

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(index);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={() => onSelect(index)}
      onKeyDown={handleKeyDown}
      className="rounded-xl p-3 sm:p-4 min-w-0 cursor-pointer"
      style={{
        border: active ? `2px solid ${color}` : "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: color }}
        />
        <p
          className="text-sm font-semibold min-w-0 wrap-break-word"
          style={{ color: "var(--text)" }}
        >
          {title}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {option.isBest && (
          <Badge
            label="Best match"
            background="var(--accent-bg)"
            color="var(--accent-text)"
          />
        )}
        {option.isCheapest && (
          <Badge
            label="Cheapest"
            background="var(--success-bg)"
            color="var(--success-text)"
          />
        )}
        {option.isFastest && (
          <Badge
            label="Fastest"
            background="var(--orange-bg)"
            color="var(--orange-text)"
          />
        )}
        {isClosest && (
          <Badge
            label="Closest to you"
            background="var(--surface-1)"
            color="var(--text-2)"
          />
        )}
      </div>

      <div>
        {walkSteps.map((step, stepIndex) => (
          <div key={stepIndex} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              <div
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
                style={{
                  background: "var(--accent-bg)",
                  color: "var(--accent-text)",
                }}
              >
                {stepIndex + 1}
              </div>
              <div
                className="w-px flex-1 my-0.5"
                style={{ background: "var(--border)" }}
              />
            </div>
            <div className="pb-2.5 min-w-0">
              <p
                className="text-[13px] wrap-break-word"
                style={{ color: "var(--text)" }}
              >
                {step.text}
                {step.kind === "get_to" && startDistanceKm != null
                  ? ` (${formatDistance(startDistanceKm)} from you)`
                  : ""}
              </p>
              {step.kind === "enter" && (
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <ModeChip mode={step.mode} />
                  {step.fareKnown && !step.fareEstimated && (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-md"
                      style={{
                        background: "var(--orange-bg)",
                        color: "var(--orange-text)",
                      }}
                    >
                      {formatNaira(step.fareMin, step.fareMax)}
                    </span>
                  )}
                  {step.fareKnown && step.fareEstimated && (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-md border border-dashed"
                      style={{
                        borderColor: "var(--orange-text)",
                        color: "var(--orange-text)",
                      }}
                    >
                      ~{formatNaira(step.fareMin, step.fareMax)} estimated
                    </span>
                  )}
                  {!step.fareKnown && (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-md border border-dashed"
                      style={{
                        borderColor: "var(--border-strong)",
                        color: "var(--text-3)",
                      }}
                    >
                      fare not confirmed yet
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {tellThem && tellThem.text && (
        <div
          className="rounded-lg p-2.5 mt-1"
          style={{ background: "var(--accent-bg)" }}
        >
          <p className="text-[11px]" style={{ color: "var(--accent-text)" }}>
            Tell them
          </p>
          <p
            className="text-[13px] font-medium wrap-break-word"
            style={{ color: "var(--accent-text)" }}
          >
            {tellThem.text}
          </p>
        </div>
      )}

      <p
        className="text-xs mt-3 wrap-break-word"
        style={{ color: "var(--text-2)" }}
      >
        {totalFareText(option)} ·{" "}
        {option.minutesKnown
          ? `${option.totalMinutes} min`
          : "time not confirmed yet"}{" "}
        · {option.transfers} transfer{option.transfers !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
