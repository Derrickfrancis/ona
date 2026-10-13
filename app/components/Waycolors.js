// One colour per "way", used on the map line and on the matching card
export const WAY_COLORS = [
  "#185FA5",
  "#0F6E56",
  "#7F4BA8",
  "#B45309",
  "#BE185D",
  "#475569",
];

export function colorForWay(index) {
  return WAY_COLORS[index % WAY_COLORS.length];
}
