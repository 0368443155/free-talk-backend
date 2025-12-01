export class AddLessonCommand {
  constructor(
    public readonly sessionId: string,
    public readonly lessonNumber: number,
    public readonly title: string,
    public readonly description?: string,
    public readonly scheduledDate: Date,
    public readonly startTime: string,
    public readonly endTime: string,
    public readonly durationMinutes: number,
    public readonly isPreview?: boolean,
    public readonly isFree?: boolean,
  ) {}
}

