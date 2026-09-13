'use client';

import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export function ApexChart({
  type,
  series,
  options,
  height,
}: {
  type: 'donut' | 'radialBar' | 'bar' | 'line' | 'area';
  series: number[] | { name?: string; data: (number | null)[] }[];
  options: ApexOptions;
  height?: number;
}) {
  return <Chart type={type} series={series} options={options} height={height} width="100%" />;
}
