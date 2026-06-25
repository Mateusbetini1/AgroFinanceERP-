"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cpfCnpjSchema = exports.brazilianPhoneSchema = exports.decimalSchema = exports.uuidSchema = exports.dateRangeSchema = exports.monthYearSchema = exports.paginationSchema = void 0;
const zod_1 = require("zod");
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.monthYearSchema = zod_1.z.object({
    month: zod_1.z.coerce.number().int().min(1).max(12).optional(),
    year: zod_1.z.coerce.number().int().min(2020).max(2100).optional(),
});
exports.dateRangeSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
});
exports.uuidSchema = zod_1.z.string().uuid();
exports.decimalSchema = zod_1.z
    .union([zod_1.z.string(), zod_1.z.number()])
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, {
    message: 'Valor deve ser um número positivo',
})
    .transform((v) => String(v));
exports.brazilianPhoneSchema = zod_1.z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido')
    .optional();
exports.cpfCnpjSchema = zod_1.z
    .string()
    .regex(/^\d{11}$|^\d{14}$/, 'CPF (11 dígitos) ou CNPJ (14 dígitos) inválido')
    .optional();
//# sourceMappingURL=index.js.map