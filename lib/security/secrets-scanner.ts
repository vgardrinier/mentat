/**
 * Secrets scanner - prevents leaking sensitive data to workers
 *
 * Scans file content for common secret patterns and blocks transmission
 */

export interface ScanResult {
  safe: boolean;
  blockedPatterns: string[];
  blockedFiles: string[];
}

// Common secret patterns
const SECRET_PATTERNS = [
  /API[_-]?KEY/i,
  /SECRET[_-]?KEY/i,
  /ACCESS[_-]?TOKEN/i,
  /AUTH[_-]?TOKEN/i,
  /PRIVATE[_-]?KEY/i,
  /PASSWORD/i,
  /STRIPE[_-]?KEY/i,
  /CLERK[_-]?KEY/i,
  /DATABASE[_-]?URL/i,
  /sk_live_/i,  // Stripe live key
  /sk_test_/i,  // Stripe test key
  /rk_live_/i,  // Stripe restricted live
  /rk_test_/i,  // Stripe restricted test
  /pk_live_/i,  // Clerk live
  /pk_test_/i,  // Clerk test
  /-----BEGIN [A-Z]+ PRIVATE KEY-----/,  // PEM keys
  /ghp_[a-zA-Z0-9]{36}/,  // GitHub personal access token
  /gho_[a-zA-Z0-9]{36}/,  // GitHub OAuth token
  /AIza[0-9A-Za-z\\-_]{35}/,  // Google API key
];

// Files that should NEVER be sent to workers
const BLOCKED_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  'credentials.json',
  'secrets.json',
  'service-account.json',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
  '.npmrc',
  '.dockercfg',
  '.git/config',
];

// File patterns that should be blocked
const BLOCKED_PATTERNS = [
  /\.pem$/,
  /\.key$/,
  /\.p12$/,
  /\.pfx$/,
  /^\.?ssh\//,
  /^\.?aws\//,
  /^\.?gcp\//,
];

export class SecretsScanner {
  /**
   * Scan file paths for sensitive files
   */
  scanFilePaths(filePaths: string[]): ScanResult {
    const blockedFiles: string[] = [];

    for (const filePath of filePaths) {
      const fileName = filePath.split('/').pop() || '';
      const fullPath = filePath.toLowerCase();

      // Check exact filename matches
      if (BLOCKED_FILES.some(blocked => fullPath.endsWith(blocked.toLowerCase()))) {
        blockedFiles.push(filePath);
        continue;
      }

      // Check pattern matches
      if (BLOCKED_PATTERNS.some(pattern => pattern.test(fullPath))) {
        blockedFiles.push(filePath);
      }
    }

    return {
      safe: blockedFiles.length === 0,
      blockedPatterns: [],
      blockedFiles,
    };
  }

  /**
   * Scan file content for secret patterns
   */
  scanFileContent(content: string, filePath: string): ScanResult {
    const blockedPatterns: string[] = [];

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        blockedPatterns.push(pattern.source);
      }
    }

    return {
      safe: blockedPatterns.length === 0,
      blockedPatterns,
      blockedFiles: blockedPatterns.length > 0 ? [filePath] : [],
    };
  }

  /**
   * Scan full context before sending to worker
   */
  scanContext(context: { files: Record<string, string> }): ScanResult {
    const allBlockedPatterns: string[] = [];
    const allBlockedFiles: string[] = [];

    // First scan file paths
    const pathScan = this.scanFilePaths(Object.keys(context.files));
    if (!pathScan.safe) {
      allBlockedFiles.push(...pathScan.blockedFiles);
    }

    // Then scan content of remaining files
    for (const [filePath, content] of Object.entries(context.files)) {
      if (allBlockedFiles.includes(filePath)) continue;

      const contentScan = this.scanFileContent(content, filePath);
      if (!contentScan.safe) {
        allBlockedPatterns.push(...contentScan.blockedPatterns);
        allBlockedFiles.push(...contentScan.blockedFiles);
      }
    }

    return {
      safe: allBlockedFiles.length === 0,
      blockedPatterns: Array.from(new Set(allBlockedPatterns)),
      blockedFiles: Array.from(new Set(allBlockedFiles)),
    };
  }

  /**
   * Redact secrets from content (for logging/debugging)
   */
  redact(content: string): string {
    let redacted = content;

    for (const pattern of SECRET_PATTERNS) {
      redacted = redacted.replace(pattern, '[REDACTED]');
    }

    return redacted;
  }
}

export const secretsScanner = new SecretsScanner();
