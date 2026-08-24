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
        // 1. Convert all values to numbers first
        const numericValues: Record<string, number> = {};
        Object.keys(values).forEach(key => {
            if (!key || key.trim() === '') return;
            const val = values[key];
            // Empty/null/undefined = 0, otherwise force Number
            numericValues[key] = val === "" || val === null || val === undefined
              ? 0
                : Number(val);
            // If Number(val) is NaN, use 0
            if (isNaN(numericValues[key])) numericValues[key] = 0;
        });

        // 2. Replace field names with values - sort by length desc to avoid partial matches
        const sortedKeys = Object.keys(numericValues).sort((a, b) => b.length - a.length);

        sortedKeys.forEach((key) => {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp("\\b" + escapedKey + "\\b", "g");
            expression = expression.replace(regex, String(numericValues[key]));
        });

        // 3. Replace any remaining field names with 0
        expression = expression.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, '0');

        // 4. Sanitize: allow numbers, operators, parens, ternary, comparison
        // Allowed: 0-9 + - * / % (). < > =!? : and space
        expression = expression.replace(/[^0-9+\-*/%().<>=!? :]/g, '');

        // 5. Handle empty expression
        if (!expression || expression.trim() === '') return 0;

        console.log("========== FORMULA DEBUG ==========");
        console.log("Original Formula:", formula);
        console.log("Values:", numericValues);
        console.log("Generated Expression:", expression);

        // 6. Safe eval with math functions
        const result = Function(
            "ROUND", "MIN", "MAX", "ABS", "FLOOR", "CEIL", "POW", "SQRT",
            `"use strict"; return (${expression});`
        )(
            Math.round, Math.min, Math.max, Math.abs, Math.floor, Math.ceil, Math.pow, Math.sqrt
        );

        console.log("Result:", result);
        console.log("===================================");

        if (typeof result === "number" &&!isNaN(result) && isFinite(result)) {
            return Number(result.toFixed(2));
        }

        return 0;

    } catch (err) {
        console.error("========== FORMULA ERROR ==========");
        console.log("Original Formula:", formula);
        console.log("Generated Expression:", expression);
        console.log("Current Values:", values);
        console.error(err);
        console.log("===================================");
        return 0;
    }
}