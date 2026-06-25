import { z } from 'zod';
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const monthYearSchema: z.ZodObject<{
    month: z.ZodOptional<z.ZodNumber>;
    year: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    year?: number | undefined;
    month?: number | undefined;
}, {
    year?: number | undefined;
    month?: number | undefined;
}>;
export declare const dateRangeSchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    startDate?: string | undefined;
    endDate?: string | undefined;
}>;
export declare const uuidSchema: z.ZodString;
export declare const decimalSchema: z.ZodEffects<z.ZodEffects<z.ZodUnion<[z.ZodString, z.ZodNumber]>, string | number, string | number>, string, string | number>;
export declare const brazilianPhoneSchema: z.ZodOptional<z.ZodString>;
export declare const cpfCnpjSchema: z.ZodOptional<z.ZodString>;
//# sourceMappingURL=index.d.ts.map