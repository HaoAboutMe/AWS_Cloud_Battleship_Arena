const SHIP_DEFS = [
  { id: "carrier", size: 5, baseOffsets: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], rotations: [0, 90, 180, 270] },
  { id: "zship", size: 4, baseOffsets: [[0, 1], [1, 1], [1, 0], [2, 0]], rotations: [0, 90, 180, 270] },
  { id: "destroyer", size: 4, baseOffsets: [[0, 0], [1, 0], [2, 0], [2, 1]], rotations: [0, 90, 180, 270] },
  { id: "patrol", size: 2, baseOffsets: [[0, 0], [0, 1]], rotations: [0, 90, 180, 270] },
  { id: "gunboat", size: 4, baseOffsets: [[0, 1], [1, 0], [1, 1], [1, 2]], rotations: [0, 90, 180, 270] },
  { id: "warship", size: 5, baseOffsets: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]], rotations: [0, 90, 180, 270] },
  { id: "cruiser", size: 3, baseOffsets: [[0, 0], [1, 0], [2, 0]], rotations: [0, 90, 180, 270] },
  { id: "flagship", size: 6, baseOffsets: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]], rotations: [0, 90, 180, 270] },
  { id: "frigate", size: 4, baseOffsets: [[0, 0], [1, 0], [2, 0], [3, 0]], rotations: [0, 90, 180, 270] },
  { id: "lancer", size: 5, baseOffsets: [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1]], rotations: [0, 90, 180, 270] },
];

const rotateOffsetsClockwise = (offsets) => offsets.map(([row, col]) => [col, -row]);

const normalizeOffsets = (offsets) => {
  const minRow = Math.min(...offsets.map(([row]) => row));
  const minCol = Math.min(...offsets.map(([, col]) => col));
  return offsets.map(([row, col]) => [row - minRow, col - minCol]);
};

const getShipOffsets = (shipDef, rotation) => {
  let offsets = shipDef.baseOffsets.map(([row, col]) => [row, col]);
  const safeRotation = shipDef.rotations.includes(rotation) ? rotation : shipDef.rotations[0];
  const steps = Math.round(safeRotation / 90) % 4;
  for (let index = 0; index < steps; index += 1) {
    offsets = rotateOffsetsClockwise(offsets);
  }
  return normalizeOffsets(offsets);
};

module.exports = { SHIP_DEFS, getShipOffsets };
