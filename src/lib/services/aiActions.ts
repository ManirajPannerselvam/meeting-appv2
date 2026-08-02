export interface AIAction {
    id?: string;
    title: string;
    description?: string;
    owner?: string;
    dueDate?: string;
    status?: string;
}


/**
 * Extract action items from meeting text
 */
export function extractActions(text: string): AIAction[] {
    if (!text) return [];

    const lines = text
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

    const actions: AIAction[] = [];

    for (const line of lines) {
        const lower = line.toLowerCase();

        if (
            lower.includes("action") ||
            lower.includes("todo") ||
            lower.includes("to do") ||
            lower.includes("follow up") ||
            lower.includes("assign")
        ) {
            actions.push({
                title: line.replace(/^[-*]\s*/, ""),
                status: "pending"
            });
        }
    }

    return actions;
}


/**
 * Get AI actions
 */
export async function getAIActions(): Promise<AIAction[]> {
    return [];
}


/**
 * Create action
 */
export async function createAIAction(action: AIAction) {
    return action;
}


/**
 * Update action
 */
export async function updateAIAction(
    id: string,
    data: Partial<AIAction>
) {
    return {
        id,
        ...data
    };
}


/**
 * Delete action
 */
export async function deleteAIAction(id: string) {
    return {
        success: true,
        id
    };
}