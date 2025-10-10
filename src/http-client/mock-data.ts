import { PaginationType } from "~/zod-common";

export interface GenerateMockData<TData> {
    data: TData[];
    pagination: PaginationType;
}

export type GeneratorFunc<TData> = (index: number) => TData;

/**
 * Generates mock data based on a provided generator function.
 *
 * @template TData
 * @param {() => TData} generator - A function that returns a single piece of mock data.
 * @param {number} [counts=10] - The number of mock data entries to generate. Defaults to 10.
 * @returns {GenerateMockData<TData>} An object containing the generated mock data and pagination information.
 */
export const mockApiData = <TData>(
    generator: GeneratorFunc<TData>,
    counts: number = 10
): GenerateMockData<TData> => ({
    data: Array.from({ length: counts }, (_, index) => generator(index)),
    pagination: {
        currentPage: 1,
        totalPages: 1,
    },
});
