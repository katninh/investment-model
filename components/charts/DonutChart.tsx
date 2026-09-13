'use client';

import type { ApexOptions } from 'apexcharts';
import { ApexChart } from './ApexChart';

export function DonutChart({
  labels,
  series,
  colors,
  height = 280,
  totalLabel = 'Total',
  formatTotal,
}: {
  labels: string[];
  series: number[];
  colors: string[];
  height?: number;
  totalLabel?: string;
  formatTotal?: (total: number) => string;
}) {
  const options: ApexOptions = {
    chart: { fontFamily: 'inherit', foreColor: '#9ca3af' },
    labels,
    colors,
    legend: { position: 'bottom', fontSize: '13px', markers: { size: 5 }, itemMargin: { horizontal: 8 } },
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            value: { fontSize: '22px', fontWeight: 700, color: undefined, formatter: (v) => `${Math.round(Number(v))}%` },
            total: {
              show: true,
              label: totalLabel,
              color: '#9ca3af',
              fontSize: '12px',
              formatter: (w) => {
                const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                return formatTotal ? formatTotal(total) : `${Math.round(total)}%`;
              },
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (v) => `${v}%` } },
  };

  return <ApexChart type="donut" series={series} options={options} height={height} />;
}
