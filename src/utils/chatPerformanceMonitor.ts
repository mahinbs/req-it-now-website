interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
}

class ChatPerformanceMonitor {
  private static instance: ChatPerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private averages: Map<string, number[]> = new Map();

  static getInstance(): ChatPerformanceMonitor {
    if (!ChatPerformanceMonitor.instance) {
      ChatPerformanceMonitor.instance = new ChatPerformanceMonitor();
    }
    return ChatPerformanceMonitor.instance;
  }

  startTimer(operationId: string, operation: string): void {
    this.metrics.set(operationId, {
      operation,
      startTime: performance.now()
    });
  }

  endTimer(operationId: string, success: boolean = true, error?: string): number | null {
    const metric = this.metrics.get(operationId);
    if (!metric) return null;

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;
    metric.success = success;
    metric.error = error;

    // Track averages
    if (!this.averages.has(metric.operation)) {
      this.averages.set(metric.operation, []);
    }
    
    const durations = this.averages.get(metric.operation)!;
    durations.push(duration);
    
    // Keep only last 10 measurements
    if (durations.length > 10) {
      durations.shift();
    }

    // Log performance
    const status = success ? '✅' : '❌';
    const errorMsg = error ? ` (${error})` : '';
    console.log(`${status} ${metric.operation}: ${duration.toFixed(2)}ms${errorMsg}`);

    return duration;
  }

  getAverageTime(operation: string): number | null {
    const durations = this.averages.get(operation);
    if (!durations || durations.length === 0) return null;

    return durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
  }

  getPerformanceReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    this.averages.forEach((durations, operation) => {
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      report[operation] = {
        average: parseFloat(avg.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        samples: durations.length
      };
    });

    return report;
  }

  logReport(): void {
    const report = this.getPerformanceReport();
    console.table(report);
  }

  clear(): void {
    this.metrics.clear();
    this.averages.clear();
  }
}

export const chatPerformanceMonitor = ChatPerformanceMonitor.getInstance();

// Helper function for easy timing
export function timeOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const operationId = `${operation}-${Date.now()}`;
  
  chatPerformanceMonitor.startTimer(operationId, operation);
  
  return fn()
    .then(result => {
      chatPerformanceMonitor.endTimer(operationId, true);
      return result;
    })
    .catch(error => {
      chatPerformanceMonitor.endTimer(operationId, false, error.message);
      throw error;
    });
}
