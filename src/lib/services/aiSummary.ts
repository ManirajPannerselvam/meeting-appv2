export function generateMeetingSummary(
  agenda: string,
  discussion: string
) {
  return {
    summary: `Discussion held regarding ${agenda}. ${discussion}`,

    decisions: [
      "Decision 1",
      "Decision 2"
    ],

    actions: [
      "Follow-up task",
      "Prepare report"
    ],

    risks: [
      "Pending approval"
    ],

    nextSteps: [
      "Review progress next meeting"
    ]
  };
}