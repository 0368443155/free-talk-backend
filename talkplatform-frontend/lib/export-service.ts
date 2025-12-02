export class ExportService {
  /**
   * Export meetings data to CSV
   */
  static exportToCSV(meetings: Map<string, any>): void {
    const rows: string[][] = [
      ['Meeting ID', 'User ID', 'Upload (kbps)', 'Download (kbps)', 'Latency (ms)', 'Quality', 'Using TURN', 'Packet Loss (%)'],
    ];
    
    for (const [meetingId, meeting] of meetings.entries()) {
      for (const [userId, metrics] of meeting.users.entries()) {
        rows.push([
          meetingId,
          userId,
          metrics.uploadBitrate.toString(),
          metrics.downloadBitrate.toString(),
          metrics.latency.toString(),
          metrics.quality,
          metrics.usingRelay ? 'Yes' : 'No',
          metrics.packetLoss.toFixed(2),
        ]);
      }
    }
    
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    this.downloadFile(csv, 'meetings-report.csv', 'text/csv');
  }
  
  /**
   * Export to JSON
   */
  static exportToJSON(meetings: Map<string, any>): void {
    const data = Array.from(meetings.entries()).map(([meetingId, meeting]) => ({
      meetingId,
      startTime: meeting.startTime,
      users: Array.from(meeting.users.entries() as Iterable<[string, any]>).map(([userId, metrics]) => ({
        userId,
        ...metrics,
      })),
    }));
    
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, 'meetings-report.json', 'application/json');
  }
  
  /**
   * Generate PDF report (using jsPDF)
   */
  static async exportToPDF(meetings: Map<string, any>): Promise<void> {
    // TODO: Implement PDF generation
    alert('PDF export coming soon!');
  }
  
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

