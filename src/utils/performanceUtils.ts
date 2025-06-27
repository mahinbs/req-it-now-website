
import { useCallback, useRef } from 'react';

// Debounce hook for optimizing rapid function calls
export const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: any[]) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

// Throttle hook for optimizing scroll and resize events
export const useThrottle = (callback: Function, delay: number) => {
  const lastCall = useRef(0);

  return useCallback((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(...args);
    }
  }, [callback, delay]);
};

// Performance monitoring utility
export const measurePerformance = (label: string, fn: Function) => {
  return async (...args: any[]) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const end = performance.now();
      console.log(`⚡ ${label} took ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`❌ ${label} failed after ${(end - start).toFixed(2)}ms:`, error);
      throw error;
    }
  };
};

// Batch message processing for better performance
export const createMessageBatchProcessor = <T>(batchSize: number = 10, delay: number = 16) => {
  const queue: T[] = [];
  let processing = false;
  
  const processQueue = async (processor: (items: T[]) => Promise<void>) => {
    if (processing || queue.length === 0) return;
    
    processing = true;
    const batch = queue.splice(0, batchSize);
    
    try {
      await processor(batch);
    } catch (error) {
      console.error('Batch processing error:', error);
    }
    
    processing = false;
    
    // Schedule next batch if there are more items
    if (queue.length > 0) {
      setTimeout(() => processQueue(processor), delay);
    }
  };
  
  return {
    add: (item: T, processor: (items: T[]) => Promise<void>) => {
      queue.push(item);
      processQueue(processor);
    },
    flush: async (processor: (items: T[]) => Promise<void>) => {
      if (queue.length > 0) {
        const allItems = queue.splice(0);
        await processor(allItems);
      }
    },
    getQueueSize: () => queue.length
  };
};

// Message cache for preventing duplicate fetches
export class MessageCache {
  private cache = new Map<string, any>();
  private timestamps = new Map<string, number>();
  private maxAge = 5 * 60 * 1000; // 5 minutes
  
  set(key: string, value: any) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }
  
  get(key: string) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() - timestamp > this.maxAge) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }
  
  has(key: string) {
    return this.get(key) !== null;
  }
  
  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

// Connection retry logic with exponential backoff
export const createRetryLogic = (maxAttempts: number = 3, baseDelay: number = 1000) => {
  let attempts = 0;
  
  const retry = async (fn: () => Promise<any>): Promise<any> => {
    try {
      const result = await fn();
      attempts = 0; // Reset on success
      return result;
    } catch (error) {
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new Error(`Max retry attempts (${maxAttempts}) exceeded: ${error}`);
      }
      
      const delay = baseDelay * Math.pow(2, attempts - 1);
      console.log(`Retry attempt ${attempts}/${maxAttempts} in ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn);
    }
  };
  
  return { retry, getAttempts: () => attempts };
};
