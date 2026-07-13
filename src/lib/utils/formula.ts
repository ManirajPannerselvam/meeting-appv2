export interface FormulaContext {
    [key: string]: any;
}

export function calculateFormula(
    formula: string,
    values: FormulaContext
): number {

    if (!formula || formula.trim() === '') return 0;

    let expression = formula;

    try {
        // Convert all values to numbers first
        const numericValues: Record<string, number> = {};
        Object.keys(values).forEach(key => {
            const val = values[key];
            numericValues[key] = val === "" || val === null || val === undefined
               ? 0
                : Number(val) || 0; // Force number conversion
        });

        // Replace field names with numeric values
        const sortedKeys = Object.keys(numericValues).sort((a, b) => b.length - a.length);

        sortedKeys.forEach((key) => {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp("\\b" + escapedKey + "\\b", "g");
            expression = expression.replace(regex, String(numericValues[key]));
        });

        // Remove any leftover field names
        expression = expression.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, '0');

        // Sanitize
        expression = expression.replace(/[^0-9+\-*/(). ]/g, '');

        // Check division by zero
        if (/\/\s*0(?![0-9.])/.test(expression)) {
            console.warn('Division by zero');
            return 0;
        }

        console.log("Expression:", expression);
        const result = Function(`"use strict"; return (${expression})`)();

        return isNaN(result) ||!isFinite(result)? 0 : Number(result.toFixed(2));

    } catch (err) {
        console.error("Formula error:", err);
        return 0;
    }
}