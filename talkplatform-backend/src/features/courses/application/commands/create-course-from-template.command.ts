export class CreateCourseFromTemplateCommand {
  constructor(
    public readonly userId: string,
    public readonly templateId: string,
    public readonly courseData: {
      title: string;
      description?: string;
      startDate: Date;
      priceFullCourse?: number;
      pricePerSession?: number;
      maxStudents?: number;
    },
  ) {}
}

