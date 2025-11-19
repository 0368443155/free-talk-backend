import { io } from 'socket.io-client';

const URL = process.env.NEXT_PUBLIC_NESTJS_URL || 'http://localhost:3000';

// autoConnect: false -> Chúng ta kiểm soát thời điểm kết nối
// Điều này ngăn socket tự kết nối khi file này được import
export const socket = io(URL, { autoConnect: false });