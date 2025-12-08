import { describe, it, expect } from 'vitest';

/**
 * Basic test to verify Vitest setup is working
 */
describe('Vitest Setup', () => {
  it('should run tests', () => {
    expect(true).toBe(true);
  });

  it('should have WebRTC APIs mocked', () => {
    expect(RTCPeerConnection).toBeDefined();
    expect(MediaStream).toBeDefined();
    expect(navigator.mediaDevices).toBeDefined();
  });

  it('should create mock RTCPeerConnection', () => {
    const pc = new RTCPeerConnection();
    expect(pc).toBeDefined();
    expect(pc.signalingState).toBe('stable');
    expect(pc.connectionState).toBe('new');
  });

  it('should create mock MediaStream', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    
    expect(stream).toBeDefined();
    expect(stream.getTracks).toBeDefined();
    expect(stream.getAudioTracks().length).toBeGreaterThan(0);
  });
});

