export default function ScoreRing({ score, size = 112, label = "Score" }) {
  const strokeWidth = size > 120 ? 8 : 6;
  const viewBoxSize = 96;
  const radius = (viewBoxSize - strokeWidth) / 2;
  const center = viewBoxSize / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#4edea3" : score >= 60 ? "#F59E0B" : "#ba1a1a";
  const fontSize = size > 120 ? "text-4xl" : "text-2xl";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" style={{ width: size, height: size }} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#e6e8ea" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${fontSize} font-extrabold font-headline tracking-tighter`} style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">{label}</span>
      </div>
    </div>
  );
}
