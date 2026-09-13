'use client';

import type { ApexOptions } from 'apexcharts';
import { ApexChart } from './ApexChart';

export function RadialGauge({
  value,
  label,
  color = '#5750f1',
  height = 200,
  displayValue,
}: {
  value: number; // 0..100
  label: string;
  color?: string;
  height?: number;
  displayValue?: string; // serializable override for the center text
}) {
  const options: ApexOptions = {
    chart: { fontFamily: 'inherit', sparkline: { enabled: false } },
    colors: [color],
    labels: [label],
    stroke: { lineCap: 'round' },
    plotOptions: {
      radialBar: {
        hollow: { size: '62%' },
        track: { background: 'rgba(148,163,184,0.18)' },
        dataLabels: {
          name: { show: true, offsetY: 22, color: '#9ca3af', fontSize: '12px' },
          value: {
            offsetY: -12,
            fontSize: '24px',
            fontWeight: 700,
            formatter: (v) => displayValue ?? `${Math.round(Number(v))}%`,
          },
        },
      },
    },
  };

  return <ApexChart type="radialBar" series={[value]} options={options} height={height} />;
}
