/**
 * WebRTC Stats Worker
 * Runs in separate thread to avoid blocking UI
 * Processes WebRTC stats and calculates bandwidth metrics
 */

let previousStats = new Map();

// Listen for messages from main thread
self.onmessage = async (e) => {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'PROCESS_STATS':
      const result = processStats(payload.peerId, payload.stats, payload.prevStats);
      self.postMessage({ 
        type: 'STATS_RESULT', 
        payload: { peerId: payload.peerId, stats: result } 
      });
      break;
      
    case 'RESET':
      previousStats.clear();
      self.postMessage({ type: 'RESET_COMPLETE' });
      break;
  }
};

/**
 * Process WebRTC stats for a single peer
 */
function processStats(peerId, currentStatsArray, prevStatsArray) {
  const currentStats = new Map(currentStatsArray.map(s => [s.id, s]));
  const prevStats = prevStatsArray ? new Map(prevStatsArray.map(s => [s.id, s])) : null;
  
  let uploadBitrate = 0;
  let downloadBitrate = 0;
  let latency = 0;
  let packetLoss = 0;
  let jitter = 0;
  let usingRelay = false;
  
  // Process each stat report
  currentStatsArray.forEach((report) => {
    // Outbound RTP (upload)
    if (report.type === 'outbound-rtp' && report.kind === 'video') {
      if (prevStats) {
        const prevReport = prevStats.get(report.id);
        if (prevReport) {
          const bytesSent = report.bytesSent - prevReport.bytesSent;
          const timeDiff = (report.timestamp - prevReport.timestamp) / 1000;
          if (timeDiff > 0) {
            uploadBitrate += (bytesSent * 8) / timeDiff / 1000; // kbps
          }
        }
      }
    }
    
    // Inbound RTP (download)
    if (report.type === 'inbound-rtp' && report.kind === 'video') {
      if (prevStats) {
        const prevReport = prevStats.get(report.id);
        if (prevReport) {
          const bytesReceived = report.bytesReceived - prevReport.bytesReceived;
          const timeDiff = (report.timestamp - prevReport.timestamp) / 1000;
          if (timeDiff > 0) {
            downloadBitrate += (bytesReceived * 8) / timeDiff / 1000; // kbps
          }
        }
      }
      
      // Packet loss
      if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
        const totalPackets = report.packetsLost + report.packetsReceived;
        if (totalPackets > 0) {
          packetLoss = (report.packetsLost / totalPackets) * 100;
        }
      }
      
      // Jitter
      if (report.jitter !== undefined) {
        jitter = report.jitter * 1000; // Convert to ms
      }
    }
    
    // Candidate pair (latency & TURN detection)
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      // Latency (RTT)
      if (report.currentRoundTripTime !== undefined) {
        latency = report.currentRoundTripTime * 1000; // Convert to ms
      }
      
      // TURN detection
      if (report.localCandidateId && report.remoteCandidateId) {
        const localCandidate = currentStatsArray.find(
          r => r.type === 'local-candidate' && r.id === report.localCandidateId
        );
        const remoteCandidate = currentStatsArray.find(
          r => r.type === 'remote-candidate' && r.id === report.remoteCandidateId
        );
        
        // Check if using relay (TURN server)
        if (localCandidate?.candidateType === 'relay' || 
            remoteCandidate?.candidateType === 'relay') {
          usingRelay = true;
        }
      }
    }
  });
  
  return {
    uploadBitrate: Math.round(uploadBitrate),
    downloadBitrate: Math.round(downloadBitrate),
    latency: Math.round(latency),
    packetLoss: Math.round(packetLoss * 10) / 10,
    jitter: Math.round(jitter * 10) / 10,
    usingRelay,
    timestamp: Date.now(),
  };
}

// Send heartbeat every second
setInterval(() => {
  self.postMessage({ type: 'HEARTBEAT' });
}, 1000);

