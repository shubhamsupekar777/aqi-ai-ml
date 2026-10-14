export function formatAQI(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return Math.round(value).toString();
}

export function formatConcentration(value: number | null | undefined, unit: string = 'µg/m³'): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  return `${value.toFixed(1)} ${unit}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatTime(timestampString: string): string {
  try {
    const d = new Date(timestampString);
    if (isNaN(d.getTime())) return timestampString;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return timestampString;
  }
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}
