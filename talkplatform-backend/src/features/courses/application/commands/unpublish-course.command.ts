export class UnpublishCourseCommand {
  constructor(
    public readonly courseId: string,
    public readonly teacherId: string,
  ) {}
}


