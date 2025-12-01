export class CheckLessonMaterialAccessQuery {
  constructor(
    public readonly userId: string,
    public readonly materialId: string,
  ) {}
}

