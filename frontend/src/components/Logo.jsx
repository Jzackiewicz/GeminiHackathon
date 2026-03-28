export function LogoMark({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Rounded square background */}
      <rect width="40" height="40" rx="10" fill="#131b2e" />
      {/* Voice waveform bars — representing interview/conversation */}
      <rect x="9" y="17" width="3.5" height="6" rx="1.75" fill="#4edea3" />
      <rect x="14.5" y="12" width="3.5" height="16" rx="1.75" fill="#4edea3" />
      <rect x="20" y="9" width="3.5" height="22" rx="1.75" fill="white" />
      <rect x="25.5" y="13" width="3.5" height="14" rx="1.75" fill="#4edea3" />
      {/* AI sparkle dot */}
      <circle cx="32" cy="11" r="2.5" fill="#4edea3" />
    </svg>
  );
}

export function LogoFull({ size = 32, className = "" }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span
        className="font-headline font-extrabold tracking-tighter text-on-surface"
        style={{ fontSize: size * 0.6 }}
      >
        Interv-<span className="text-on-tertiary-container">U</span>
      </span>
    </div>
  );
}
