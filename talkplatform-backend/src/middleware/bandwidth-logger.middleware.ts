import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class BandwidthLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BandwidthLoggerMiddleware.name);

  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const startSize = this.getRequestSize(req);
    
    // Ghi đè end method để capture response size
    const originalEnd = res.end;
    let responseSize = 0;

    res.end = function(chunk?: any) {
      if (chunk) {
        responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      }
      
      // Tính toán metrics
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Lưu metrics không đồng bộ để không ảnh hưởng response
      setImmediate(async () => {
        try {
          await this.metricsService.goodInsertMethod({
            endpoint: req.originalUrl,
            method: req.method,
            statusCode: res.statusCode,
            responseTimeMs: responseTime,
            inboundBytes: startSize,
            outboundBytes: responseSize,
            activeConnections: 1, // Có thể cải thiện để đếm chính xác
            userId: (req as any).user?.id
          });
        } catch (error) {
          // Không log lỗi để tránh spam logs
        }
      });

      return originalEnd.call(res, chunk);
    };

    next();
  }

  private getRequestSize(req: Request): number {
    let size = 0;
    
    // Headers size estimate
    size += JSON.stringify(req.headers).length;
    
    // Body size
    if (req.body) {
      size += Buffer.isBuffer(req.body) 
        ? req.body.length 
        : Buffer.byteLength(JSON.stringify(req.body));
    }
    
    return size;
  }
}