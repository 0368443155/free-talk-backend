export class GetCourseDetailsQuery {
  constructor(public readonly courseId: string, public readonly includeSessions?: boolean) {}
}

