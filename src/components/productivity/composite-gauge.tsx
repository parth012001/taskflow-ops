"use client";

interface CompositeGaugeProps {
  score: number;
  size?: number;
}

function getGaugeColor(score: number) {
  if (score >= 70) return "text-green-500";
  if (score >= 40) return "text-yellow-500";
  return "text-red-500";
}

export function CompositeGauge({ score, size = 120 }: CompositeGaugeProps) {
  const radius = (size / 2) - 8;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(score, 0), 100);
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          className={getGaugeColor(score)}
        />
      </svg>
      <span className="absolute text-2xl font-bold text-gray-900" style={{ fontSize: size * 0.2 }}>
        {Math.round(score)}
      </span>
    </div>
  );
}
