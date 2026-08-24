export interface ValidationResult {
    valid: boolean;
    errors: Record<string, string>;
}

export function validateForm(
    fields: any[],
    values: Record<string, any>
): ValidationResult {

    const errors: Record<string, string> = {};

    for (const field of fields) {

        const value = values[field.field_name];

        // ===============================
        // Required
        // ===============================

        if (
            field.required &&
            (
                value === undefined ||
                value === null ||
                value === "" ||
                value === false
            )
        ) {

            errors[field.field_name] =
                `${field.field_label} is required`;

            continue;

        }

        // ===============================
        // Number
        // ===============================

        if (
            field.field_type === "number" &&
            value !== undefined &&
            value !== ""
        ) {

            if (isNaN(Number(value))) {

                errors[field.field_name] =
                    `${field.field_label} must be a number`;

                continue;

            }

            if (
                field.min !== undefined &&
                Number(value) < field.min
            ) {

                errors[field.field_name] =
                    `Minimum value is ${field.min}`;

            }

            if (
                field.max !== undefined &&
                Number(value) > field.max
            ) {

                errors[field.field_name] =
                    `Maximum value is ${field.max}`;

            }

        }

        // ===============================
        // Text Length
        // ===============================

        if (
            field.field_type === "text" &&
            value
        ) {

            if (
                field.minLength &&
                value.length < field.minLength
            ) {

                errors[field.field_name] =
                    `Minimum ${field.minLength} characters`;

            }

            if (
                field.maxLength &&
                value.length > field.maxLength
            ) {

                errors[field.field_name] =
                    `Maximum ${field.maxLength} characters`;

            }

        }

        // ===============================
        // Regex
        // ===============================

        if (
            field.pattern &&
            value
        ) {

            const regex = new RegExp(field.pattern);

            if (!regex.test(value)) {

                errors[field.field_name] =
                    field.validationMessage ??
                    "Invalid value";

            }

        }

    }

    return {

        valid: Object.keys(errors).length === 0,

        errors

    };

}