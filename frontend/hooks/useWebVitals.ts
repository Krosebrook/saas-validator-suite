import { useEffect } from 'react';
import { onCLS, onLCP, onINP, onTTFB, onFCP } from 'web-vitals';
import backend from '~backend/client';

export function useWebVitals(userId?: string) {
  useEffect(() => {
    const metrics: any[] = [];
    let timeoutId: NodeJS.Timeout;

    const sendMetrics = () => {
      if (metrics.length === 0) return;

      backend.perf.recordWebVitals({ 
        metrics: [...metrics],
        userId 
      }).catch(error => {
        console.error('Failed to send web vitals:', error);
      });

      metrics.length = 0;
    };

    const handleMetric = (metric: any) => {
      const rating = getRating(metric.name, metric.value);
      
      metrics.push({
        name: metric.name,
        value: metric.value,
        rating,
        route: window.location.pathname,
        device: getDeviceType()
      });

      clearTimeout(timeoutId);
      timeoutId = setTimeout(sendMetrics, 2000);
    };

    onCLS(handleMetric);
    onLCP(handleMetric);
    onINP(handleMetric);
    onTTFB(handleMetric);
    onFCP(handleMetric as any);

    return () => {
      clearTimeout(timeoutId);
      sendMetrics();
    };
  }, [userId]);
}

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    CLS: [0.1, 0.25],
    LCP: [2500, 4000],
    INP: [200, 500],
    TTFB: [800, 1800],
    FCP: [1800, 3000]
  };

  const [good, poor] = thresholds[name] || [0, 0];

  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return 'mobile';
  if (/tablet/i.test(ua)) return 'tablet';
  return 'desktop';
}
