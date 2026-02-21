/**
 * Worker-related TypeScript types
 */

export interface WorkerOffer {
  id: string; // e.g., "landing-page-redesign"
  title: string; // e.g., "Landing Page Redesign"
  priceCents: number; // e.g., 1200 = $12.00
  currency: string; // e.g., "USD"
  etaMinutesMin: number; // e.g., 30
  etaMinutesMax: number; // e.g., 60
  revisionsIncluded: number; // e.g., 1
  scopeNotes: string; // e.g., "Single page redesign with modern UI"
  tags: string[]; // e.g., ["design", "landing-page", "ui"]
}

export type WorkerType = 'solo' | 'company';

export interface WorkerProfile {
  name: string;
  workerType: WorkerType;
  description: string;
  specialty: string;
  offers: WorkerOffer[];
  apiEndpoint: string;
  webhookSecret: string;
  acceptingJobs: boolean;
  maxConcurrentJobs: number;
}

/**
 * Agent-generated draft for worker profile
 * This is what the agent returns when helping fill the form
 */
export interface WorkerDraft {
  name: string;
  description: string;
  specialty: string;
  tags: string[];
  apiEndpoint: string;
  offers: Array<{
    title: string;
    priceUsd: number; // Agent provides USD, we convert to cents
    etaMinutes: { min: number; max: number };
    revisions: number;
    scope: string;
    tags: string[];
  }>;
}

/**
 * Webhook test result
 */
export interface WebhookTestResult {
  success: boolean;
  latencyMs?: number;
  error?: string;
  response?: any;
}
