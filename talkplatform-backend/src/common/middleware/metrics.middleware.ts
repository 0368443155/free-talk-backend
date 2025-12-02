import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsCollector } from '../../metrics/services/metrics-collector.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsCollector: MetricsCollector) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const metricsCollector = this.metricsCollector; // Capture for closure
    
    // Get request size from Content-Length header
    const requestSize = parseInt(req.headers['content-length'] || '0', 10);
    
    // Track response size across multiple writes
    let responseSize = 0;
    
    // 🔥 FIX 1: Override res.write to capture streaming data
    const originalWrite = res.write;
    res.write = function(chunk: any, encoding?: any, callback?: any): boolean {
      if (chunk) {
        responseSize += Buffer.byteLength(chunk, encoding);
      }
      return originalWrite.call(this, chunk, encoding, callback);
    };
    
    // Override res.end to capture final chunk and collect metrics
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any, callback?: any): any {
      if (chunk) {
        responseSize += Buffer.byteLength(chunk, encoding);
      }
      
      // Collect metrics (non-blocking, fire-and-forget)
      setImmediate(() => {
        metricsCollector.collect({
          endpoint: req.path,
          method: req.method,
          requestSize,
          responseSize, // Now includes all write() calls
          responseTime: Date.now() - startTime,
          statusCode: res.statusCode,
          timestamp: new Date(),
          userId: (req as any).user?.id,
        }).catch(err => {
          // Silent fail - don't break API
          console.error('Metrics collection failed:', err);
        });
      });
      
      // Call original end
      return originalEnd.call(this, chunk, encoding, callback);
    };
    
    next();
  }
}

