import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface WebSocketEvent {
  name: string; // Tên sự kiện (ví dụ: 'system-metrics')
  data: unknown;
}

@Injectable()
export class AppService {
  // private Subject là trái tim của event bus
  private events$ = new Subject<WebSocketEvent>();

  // Phương thức cho Gateway sử dụng để lắng nghe
  getEventsToEmit() {
    return this.events$.asObservable();
  }

  // Phương thức cho các Service khác sử dụng để gửi sự kiện
  addEvent(name: string, data: unknown) {
    this.events$.next({ name, data });
  }

  getHello(): string {
    return 'TalkPlatform Backend API is running!';
  }
}
