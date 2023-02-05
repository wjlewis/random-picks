const leftTip = [-1, 0];
const rightTip = [1, 0];

const bodyFrac = 0.6;
const width = 0.15;

const a = [-bodyFrac, -width / 2];
const b = [-bodyFrac, width / 2];
const c = [bodyFrac, -width / 2];
const d = [bodyFrac, width / 2];

// prettier-ignore
const model = [
  ...leftTip,
  ...a,
  ...b,
  ...c,
  ...d,
  ...rightTip,
];

export default model;
