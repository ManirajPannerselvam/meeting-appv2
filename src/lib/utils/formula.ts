export interface FormulaContext {
    [key: string]: any;
}

export function calculateFormula(
    formula: string,
    values: FormulaContext
): number {

    if (!formula) return 0;

    let expression = formula;

    // Replace longest names first
    const keys = Object.keys(values).sort((a, b) => b.length - a.length);

    for (const key of keys) {

        const value = Number(values[key]) || 0;

        // {Field}
        expression = expression.replace(
            new RegExp(`\\{${key}\\}`, "gi"),
            String(value)
        );

        // Field
        expression = expression.replace(
            new RegExp(`\\b${key}\\b`, "gi"),
            String(value)
        );
    }

    // remove %
    expression = expression.replace(/%/g, "");

    console.log("FORMULA :", formula);
    console.log("VALUES  :", values);
    console.log("EXPR    :", expression);

    try {

        const result = Function(
            `"use strict";return (${expression})`
        )();

        return Number(Number(result).toFixed(2));

    } catch (e) {

        console.error("Formula Error", e);

        return 0;
    }
}