import {useMemo} from 'react';
import {Skia} from '@shopify/react-native-skia';

type DataPoint = {date: string; count: number};

interface ChartPaths {
  linePath: ReturnType<typeof Skia.Path.Make>;
  fillPath: ReturnType<typeof Skia.Path.Make>;
  minValue: number;
  maxValue: number;
  firstValue: number;
  lastValue: number;
}

/**
 * Transforms time-series data into smooth Skia paths for an area chart.
 * Uses Catmull-Rom → cubic bezier interpolation for smooth curves.
 * Falls back to straight lines when fewer than 4 data points.
 */
export function useChartData(
  series: DataPoint[] | undefined,
  width: number,
  height: number,
  topPadding = 16,
): ChartPaths | null {
  return useMemo(() => {
    if (!series || series.length === 0 || width <= 0 || height <= 0) {
      return null;
    }

    const counts = series.map(d => d.count);
    const minValue = Math.min(...counts);
    const maxValue = Math.max(...counts);
    const range = maxValue - minValue || 1;
    const drawHeight = height - topPadding;

    // Map data to canvas coordinates
    const points = counts.map((count, i) => ({
      x: series.length === 1 ? width / 2 : (i / (series.length - 1)) * width,
      y: topPadding + drawHeight - ((count - minValue) / range) * drawHeight,
    }));

    const linePath = Skia.Path.Make();
    const fillPath = Skia.Path.Make();

    if (points.length === 1) {
      // Single dot — draw a small circle-like point
      const p = points[0];
      linePath.moveTo(p.x - 2, p.y);
      linePath.lineTo(p.x + 2, p.y);
      fillPath.moveTo(0, height);
      fillPath.lineTo(width, height);
      fillPath.close();
      return {linePath, fillPath, minValue, maxValue, firstValue: counts[0], lastValue: counts[0]};
    }

    if (points.length <= 3) {
      // Straight lines for few points
      linePath.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        linePath.lineTo(points[i].x, points[i].y);
      }
    } else {
      // Catmull-Rom → cubic bezier for smooth curves
      linePath.moveTo(points[0].x, points[0].y);

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[Math.min(points.length - 1, i + 1)];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        const tension = 0.3;
        const cp1x = p1.x + ((p2.x - p0.x) * tension);
        const cp1y = p1.y + ((p2.y - p0.y) * tension);
        const cp2x = p2.x - ((p3.x - p1.x) * tension);
        const cp2y = p2.y - ((p3.y - p1.y) * tension);

        linePath.cubicTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }
    }

    // Build fill path by copying the line and closing to bottom
    fillPath.addPath(linePath);
    fillPath.lineTo(points[points.length - 1].x, height);
    fillPath.lineTo(points[0].x, height);
    fillPath.close();

    return {
      linePath,
      fillPath,
      minValue,
      maxValue,
      firstValue: counts[0],
      lastValue: counts[counts.length - 1],
    };
  }, [series, width, height, topPadding]);
}
