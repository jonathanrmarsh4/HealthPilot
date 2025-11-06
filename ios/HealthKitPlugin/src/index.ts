import { registerPlugin } from '@capacitor/core';

export interface HealthPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(options: { read: string[]; write: string[] }): Promise<any>;
  checkAuthorization(options: { read: string[]; write: string[] }): Promise<any>;
  readSamples(options: {
    dataType: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    ascending?: boolean;
  }): Promise<{ samples: any[] }>;
  readCategorySamples(options: {
    dataType: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    ascending?: boolean;
  }): Promise<{ samples: any[] }>;
  saveSample(options: {
    dataType: string;
    value: number;
    unit?: string;
    startDate?: string;
    endDate?: string;
    metadata?: Record<string, string>;
  }): Promise<void>;
  getPluginVersion(): Promise<{ version: string }>;
}

const Health = registerPlugin<HealthPlugin>('Health');

export default Health;
