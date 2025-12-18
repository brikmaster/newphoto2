import { NextRequest } from 'next/server';

interface RateLimitConfig {
  interval: number;
  uniqueTokenPerInterval: number;
}

interface TokenData {
  timestamps: number[];
  lastCleanup: number;
}

export function rateLimit(config: RateLimitConfig) {
  const tokens = new Map<string, TokenData>();
  const CLEANUP_INTERVAL = 60000; // Cleanup every minute
  
  // Cleanup old entries to prevent memory leaks
  const cleanup = () => {
    const now = Date.now();
    const windowStart = now - config.interval;
    
    for (const [key, data] of tokens.entries()) {
      if (data.lastCleanup < now - CLEANUP_INTERVAL) {
        data.timestamps = data.timestamps.filter(timestamp => timestamp > windowStart);
        data.lastCleanup = now;
        
        // Remove empty entries
        if (data.timestamps.length === 0) {
          tokens.delete(key);
        }
      }
    }
  };
  
  return {
    async check(request: NextRequest, limit: number, identifier: string): Promise<boolean> {
      // Get IP from headers with proper fallback chain
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const ip = (forwarded?.split(',')[0]?.trim()) || realIp || 'anonymous';
      const key = `${identifier}:${ip}`;
      const now = Date.now();
      const windowStart = now - config.interval;
      
      // Periodic cleanup
      if (Math.random() < 0.1) { // 10% chance to run cleanup
        cleanup();
      }
      
      // Get or create token data
      const tokenData = tokens.get(key) || { timestamps: [], lastCleanup: now };
      
      // Filter valid timestamps within the window
      tokenData.timestamps = tokenData.timestamps.filter(timestamp => timestamp > windowStart);
      
      // Check if limit exceeded
      if (tokenData.timestamps.length >= limit) {
        throw new Error('Rate limit exceeded');
      }
      
      // Add current timestamp
      tokenData.timestamps.push(now);
      tokenData.lastCleanup = now;
      tokens.set(key, tokenData);
      
      return true;
    }
  };
}



