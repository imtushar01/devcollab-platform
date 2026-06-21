export class IssueCreatedEvent {
  constructor(
    public readonly issueId: string,
    public readonly repoId: string,
    public readonly authorId: string,
    public readonly assigneeId: string | null,
    public readonly title: string,
  ) {}
}

export class IssueCommentedEvent {
  constructor(
    public readonly issueId: string,
    public readonly commentId: string,
    public readonly authorId: string,
    public readonly issueAuthorId: string,
    public readonly body: string,
  ) {}
}

export class IssueStatusChangedEvent {
  constructor(
    public readonly issueId: string,
    public readonly newStatus: string,
    public readonly changedById: string,
  ) {}
}

export class PrReviewSubmittedEvent {
  constructor(
    public readonly prId: string,
    public readonly reviewerId: string,
    public readonly prAuthorId: string,
    public readonly reviewStatus: string,
  ) {}
}