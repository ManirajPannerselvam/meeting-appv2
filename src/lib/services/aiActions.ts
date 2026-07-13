export function extractActions(notes: string) {
  const actions = [];

  const lines = notes.split("\n");

  for (const line of lines) {
    if (
      line.toLowerCase().includes("need") ||
      line.toLowerCase().includes("action") ||
      line.toLowerCase().includes("follow")
    ) {
      actions.push({
        task: line.trim(),
        owner: "Unassigned",
        status: "Open"
      });
    }
  }

  return actions;
}