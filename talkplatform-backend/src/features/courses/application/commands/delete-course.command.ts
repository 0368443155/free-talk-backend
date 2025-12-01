export class DeleteCourseCommand {
  constructor(
    public readonly courseId: string,
    public readonly teacherId: string,
  ) {}
}


