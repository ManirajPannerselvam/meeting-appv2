import { log } from "./logger";

export async function measure<T extends (...args: any[]) => any>(
    name: string,
    fn: T,
    ...args: Parameters<T>
): Promise<Awaited<ReturnType<T>>> {
    const t0 = performance.now();

    try {
        const result = await fn(...args);

        const t1 = performance.now();

        log(
            "PERFORMANCE",
            name,
            `Completed in ${(t1 - t0).toFixed(2)} ms`
        );

        return result;
    } catch (e) {
        const t1 = performance.now();

        log(
            "ERROR",
            "PERFORMANCE",
            `${name} failed after ${(t1 - t0).toFixed(2)} ms : ${String(e)}`
        );

        throw e;
    }
}

export function timeStart(): number {
    return performance.now();
}

export function timeEnd(name: string, start: number): void {
    const t1 = performance.now();

    log(
        "PERFORMANCE",
        name,
        `${(t1 - start).toFixed(2)} ms`
    );
}

export default {
    measure,
    timeStart,
    timeEnd
};