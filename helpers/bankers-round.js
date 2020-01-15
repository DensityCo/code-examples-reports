export default function bankersRound(value, digits=2) {
  const x = value * Math.pow(10, digits);
  const y = Math.round(x);
  return (Math.abs(x) % 1 === 0.5 ? (y % 2 === 0 ? y : y - 1) : y) / Math.pow(10, digits);
}