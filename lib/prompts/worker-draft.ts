/**
 * Agent-Draft Prompt System for Worker Registration
 *
 * This provides a prompt template that workers can give to their AI agent
 * The agent returns structured JSON
 * The human reviews and approves the draft
 */

export const WORKER_DRAFT_PROMPT = `I need to register as a worker on the Agent Marketplace platform. Please help me draft my worker profile.

# Your Task

Generate a JSON object with my worker profile information following this EXACT format:

\`\`\`json
{
  "name": "Your worker name (e.g., 'TypeScript Refactoring Expert')",
  "description": "2-3 sentence description of what you do and your expertise",
  "specialty": "primary specialty in lowercase-with-dashes (e.g., 'typescript', 'landing-page-design', 'api-integration')",
  "tags": ["tag1", "tag2", "tag3"],
  "apiEndpoint": "https://your-worker-server.com/webhook",
  "offers": [
    {
      "title": "Name of service (e.g., 'TypeScript Migration')",
      "priceUsd": 15.00,
      "etaMinutes": {
        "min": 20,
        "max": 40
      },
      "revisions": 1,
      "scope": "One-line description of what's included",
      "tags": ["typescript", "migration"]
    }
  ]
}
\`\`\`

# Requirements

1. **name**: Short, professional name for your worker
2. **description**: Explain what you do, your expertise, and unique value
3. **specialty**: ONE primary specialty (lowercase-with-dashes)
4. **tags**: 3-5 relevant tags for discoverability
5. **apiEndpoint**: Your webhook URL (where you'll receive job notifications)
6. **offers**: Array of 2-5 specific services you provide

## Offers Structure

Each offer should have:
- **title**: Clear service name (e.g., "Landing Page Redesign")
- **priceUsd**: Fixed price in USD (e.g., 12.00)
- **etaMinutes**: Time range (min/max in minutes)
- **revisions**: How many revisions included (0-3 typical)
- **scope**: 1-2 sentences explaining what's included
- **tags**: Relevant tags for matching

# Examples

## Example 1: TypeScript Expert

\`\`\`json
{
  "name": "TypeScript Refactoring Expert",
  "description": "Specialized in modernizing JavaScript codebases to TypeScript. Expert in type inference, generics, and architectural improvements. 5+ years TypeScript experience.",
  "specialty": "typescript",
  "tags": ["typescript", "refactoring", "migration", "type-safety"],
  "apiEndpoint": "https://ts-worker.example.com/webhook",
  "offers": [
    {
      "title": "TypeScript Migration",
      "priceUsd": 25.00,
      "etaMinutes": { "min": 30, "max": 60 },
      "revisions": 1,
      "scope": "Convert JavaScript file/module to TypeScript with proper types and interfaces",
      "tags": ["typescript", "migration"]
    },
    {
      "title": "Type Safety Audit",
      "priceUsd": 15.00,
      "etaMinutes": { "min": 15, "max": 30 },
      "revisions": 0,
      "scope": "Analyze codebase and add missing type annotations for better type safety",
      "tags": ["typescript", "audit", "types"]
    }
  ]
}
\`\`\`

## Example 2: Landing Page Designer

\`\`\`json
{
  "name": "Landing Page Design Specialist",
  "description": "Create high-converting landing pages with modern UI/UX. Expert in responsive design, animations, and conversion optimization.",
  "specialty": "landing-page-design",
  "tags": ["landing-page", "design", "ui", "conversion", "responsive"],
  "apiEndpoint": "https://landing-worker.example.com/webhook",
  "offers": [
    {
      "title": "Landing Page Redesign",
      "priceUsd": 50.00,
      "etaMinutes": { "min": 60, "max": 120 },
      "revisions": 2,
      "scope": "Complete landing page redesign with hero section, features, CTA, and mobile-responsive layout",
      "tags": ["landing-page", "design", "full-page"]
    },
    {
      "title": "Hero Section Design",
      "priceUsd": 20.00,
      "etaMinutes": { "min": 20, "max": 40 },
      "revisions": 1,
      "scope": "Modern hero section with headline, subheading, CTA button, and background design",
      "tags": ["landing-page", "hero", "design"]
    }
  ]
}
\`\`\`

# Important Notes

- **Pricing**: Be realistic. $5-$50 per service is typical range.
- **ETA**: Be honest. Builders will see this and expect delivery within the timeframe.
- **Scope**: Be specific so builders know exactly what they'll get.
- **Tags**: Use lowercase, no spaces. Helps with matching.

# Output

Please generate the JSON for my worker profile based on:
- What I specialize in
- Services I can provide
- My webhook endpoint URL

Return ONLY the JSON object, no other text.`;

/**
 * Parse agent-generated draft and validate
 */
export function parseWorkerDraft(jsonString: string): {
  success: boolean;
  data?: any;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);

    // Basic validation
    if (!data.name || typeof data.name !== 'string') {
      return { success: false, error: 'Missing or invalid "name"' };
    }

    if (!data.description || typeof data.description !== 'string') {
      return { success: false, error: 'Missing or invalid "description"' };
    }

    if (!data.specialty || typeof data.specialty !== 'string') {
      return { success: false, error: 'Missing or invalid "specialty"' };
    }

    if (!data.apiEndpoint || typeof data.apiEndpoint !== 'string') {
      return { success: false, error: 'Missing or invalid "apiEndpoint"' };
    }

    if (!Array.isArray(data.offers) || data.offers.length === 0) {
      return { success: false, error: 'Must provide at least one offer' };
    }

    // Validate offers
    for (const offer of data.offers) {
      if (!offer.title || !offer.priceUsd || !offer.etaMinutes) {
        return { success: false, error: 'Invalid offer format' };
      }
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    };
  }
}

/**
 * Convert agent draft to platform format
 */
export function convertDraftToOffers(draft: any) {
  return draft.offers.map((offer: any, index: number) => ({
    id: `offer-${Date.now()}-${index}`,
    title: offer.title,
    priceCents: Math.round(offer.priceUsd * 100),
    currency: 'USD',
    etaMinutesMin: offer.etaMinutes.min,
    etaMinutesMax: offer.etaMinutes.max,
    revisionsIncluded: offer.revisions || 0,
    scopeNotes: offer.scope,
    tags: offer.tags || [],
  }));
}
