export function SimpleLineChart({ data, title, subtitle }) {
  const width = 520;
  const height = 220;
  const max = Math.max(...data.map((point) => point.value), 1);
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const path = data
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.value / max) * (height - 24) - 12;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/80 p-6 shadow-sm dark:bg-slate-900/80">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <div className="mt-8">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full overflow-visible">
          <defs>
            <linearGradient id="paymentLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
          {Array.from({ length: 4 }, (_, index) => (
            <line
              key={index}
              x1="0"
              y1={16 + index * 60}
              x2={width}
              y2={16 + index * 60}
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeDasharray="6 6"
            />
          ))}
          <path d={path} fill="none" stroke="url(#paymentLine)" strokeWidth="4" strokeLinecap="round" />
          {data.map((point, index) => {
            const x = index * step;
            const y = height - (point.value / max) * (height - 24) - 12;
            return (
              <g key={point.label}>
                <circle cx={x} cy={y} r="6" fill="#2563eb" />
                <text x={x} y={height + 10} textAnchor="middle" className="fill-slate-400 text-[12px]">
                  {point.shortLabel || point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
