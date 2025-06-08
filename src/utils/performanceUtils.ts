
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
      console.log(`${label} took ${end - start} milliseconds`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`${label} failed after ${end - start} milliseconds:`, error);
      throw error;
    }
  };
};

// Optimize large list rendering
export const createVirtualScrollConfig = (itemHeight: number, containerHeight: number) => {
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  const bufferSize = Math.ceil(visibleItems * 0.5); // 50% buffer
  
  return {
    itemHeight,
    visibleItems,
    bufferSize,
    totalVisible: visibleItems + bufferSize * 2
  };
};

// Optimize image loading
export const createOptimizedImageLoader = () => {
  const imageCache = new Map();
  
  return {
    loadImage: (src: string): Promise<HTMLImageElement> => {
      if (imageCache.has(src)) {
        return Promise.resolve(imageCache.get(src));
      }
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          imageCache.set(src, img);
          resolve(img);
        };
        img.onerror = reject;
        img.src = src;
      });
    },
    clearCache: () => imageCache.clear(),
    getCacheSize: () => imageCache.size
  };
};

// Batch operations for better performance
export const createBatchProcessor = <T>(batchSize: number = 10, delay: number = 16) => {
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
