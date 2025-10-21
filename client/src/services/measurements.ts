// Measurement service for fetching biomarker data

export interface Measurement {
  type: string;
  value: number | { systolic?: number; diastolic?: number } | Record<string, number>;
  unit: string;
  recordedAt: string;
}

export async function getLatestMeasurement(
  metricId: string
): Promise<Measurement | null> {
  try {
    const response = await fetch(`/api/biomarkers/latest/${metricId}`);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch latest measurement for ${metricId}:`, error);
    return null;
  }
}

export async function getEarliestMeasurement(
  metricId: string,
  since?: Date
): Promise<Measurement | null> {
  try {
    const params = new URLSearchParams();
    if (since) {
      params.set("since", since.toISOString());
    }
    const url = `/api/biomarkers/earliest/${metricId}${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      `Failed to fetch earliest measurement for ${metricId}:`,
      error
    );
    return null;
  }
}
