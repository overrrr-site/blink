import { z } from 'zod';
import { BUSINESS_TYPES, type BusinessType } from '../utils/businessTypes.js';

const CONTRACT_TYPES = ['月謝制', 'チケット制', '単発'] as const;
const RESERVATION_STATUSES = ['予定', '登園済', '降園済', 'キャンセル'] as const;
const CLOSED_DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2}[T\s]([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

function firstValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeOptionalNullableString(value: unknown): unknown {
  const normalized = firstValue(value);
  if (normalized === undefined) return undefined;
  if (normalized === null) return null;
  if (typeof normalized === 'string') {
    const trimmed = normalized.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return normalized;
}

function normalizeNullableString(value: unknown): unknown {
  const normalized = normalizeOptionalNullableString(value);
  return normalized === undefined ? null : normalized;
}

function normalizeRequiredString(value: unknown): unknown {
  const normalized = firstValue(value);
  if (typeof normalized === 'string') {
    return normalized.trim();
  }
  return normalized;
}

function normalizeNumber(value: unknown): unknown {
  const normalized = firstValue(value);
  if (typeof normalized === 'string') {
    const trimmed = normalized.trim();
    if (!trimmed) return normalized;
    return Number(trimmed);
  }
  return normalized;
}

function normalizeOptionalNullableNumber(value: unknown): unknown {
  const normalized = firstValue(value);
  if (normalized === undefined) return undefined;
  if (normalized === null) return null;
  if (typeof normalized === 'string') {
    const trimmed = normalized.trim();
    if (!trimmed) return null;
    return Number(trimmed);
  }
  return normalized;
}

function hasDefinedFields(value: Record<string, unknown>): boolean {
  return Object.values(value).some((item) => item !== undefined);
}

function requiredStringField(label: string) {
  return z.preprocess(
    normalizeRequiredString,
    z.string({
      required_error: `${label}は必須です`,
      invalid_type_error: `${label}が不正です`,
    }).min(1, `${label}は必須です`),
  );
}

function nullableStringField(label: string) {
  return z.preprocess(
    normalizeNullableString,
    z.union([
      z.string({ invalid_type_error: `${label}が不正です` }),
      z.null(),
    ]),
  );
}

function optionalNullableStringField(label: string) {
  return z.preprocess(
    normalizeOptionalNullableString,
    z.union([
      z.string({ invalid_type_error: `${label}が不正です` }),
      z.null(),
      z.undefined(),
    ]),
  );
}

function requiredPositiveIntField(label: string) {
  return z.preprocess(
    normalizeNumber,
    z.number({
      required_error: `${label}は必須です`,
      invalid_type_error: `${label}が不正です`,
    }).int().positive(`${label}が不正です`),
  );
}

function optionalNullableIntField(label: string, minimum = 0) {
  return z.preprocess(
    normalizeOptionalNullableNumber,
    z.union([
      z.number({ invalid_type_error: `${label}が不正です` }).int().min(minimum, `${label}が不正です`),
      z.null(),
      z.undefined(),
    ]),
  );
}

function optionalNullableNumberField(label: string, minimum = 0) {
  return z.preprocess(
    normalizeOptionalNullableNumber,
    z.union([
      z.number({ invalid_type_error: `${label}が不正です` }).finite().min(minimum, `${label}が不正です`),
      z.null(),
      z.undefined(),
    ]),
  );
}

function requiredDateField(label: string) {
  return z.preprocess(
    normalizeRequiredString,
    z.string({
      required_error: `${label}は必須です`,
      invalid_type_error: `${label}が不正です`,
    }).regex(DATE_REGEX, `${label}が不正です`),
  );
}

function optionalDateField(label: string) {
  return z.preprocess((value) => {
    const normalized = firstValue(value);
    if (normalized === undefined || normalized === null) return undefined;
    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return normalized;
  }, z.union([
    z.string({ invalid_type_error: `${label}が不正です` }).regex(DATE_REGEX, `${label}が不正です`),
    z.undefined(),
  ]));
}

function optionalNullableDateField(label: string) {
  return z.preprocess((value) => {
    const normalized = firstValue(value);
    if (normalized === undefined) return undefined;
    if (normalized === null) return null;
    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return normalized;
  }, z.union([
    z.string({ invalid_type_error: `${label}が不正です` }).regex(DATE_REGEX, `${label}が不正です`),
    z.null(),
    z.undefined(),
  ]));
}

function requiredTimeField(label: string) {
  return z.preprocess(
    normalizeRequiredString,
    z.string({
      required_error: `${label}は必須です`,
      invalid_type_error: `${label}が不正です`,
    }).regex(TIME_REGEX, `${label}が不正です`),
  );
}

function optionalNullableDateTimeField(label: string) {
  return z.preprocess((value) => {
    const normalized = firstValue(value);
    if (normalized === undefined) return undefined;
    if (normalized === null) return null;
    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return normalized;
  }, z.union([
    z.string({ invalid_type_error: `${label}が不正です` }).regex(DATETIME_REGEX, `${label}が不正です`),
    z.null(),
    z.undefined(),
  ]));
}

function optionalMonthField(label: string) {
  return z.preprocess((value) => {
    const normalized = firstValue(value);
    if (normalized === undefined || normalized === null) return undefined;
    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return normalized;
  }, z.union([
    z.string({ invalid_type_error: `${label}が不正です` }).regex(MONTH_REGEX, `${label}が不正です`),
    z.undefined(),
  ]));
}

function businessTypeField(label: string) {
  return z.preprocess((value) => {
    const normalized = firstValue(value);
    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return normalized;
  }, z.union([
    z.string({ invalid_type_error: `${label}が不正です` })
      .refine((value): value is BusinessType => BUSINESS_TYPES.includes(value as BusinessType), `${label}が不正です`),
    z.undefined(),
  ]));
}

function nullableBusinessTypeField(label: string) {
  return z.preprocess((value) => {
    const normalized = firstValue(value);
    if (normalized === undefined) return undefined;
    if (normalized === null) return null;
    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return normalized;
  }, z.union([
    z.string({ invalid_type_error: `${label}が不正です` })
      .refine((value): value is BusinessType => BUSINESS_TYPES.includes(value as BusinessType), `${label}が不正です`),
    z.null(),
    z.undefined(),
  ]));
}

function businessTypesField(label: string) {
  return z.preprocess((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return Array.isArray(value) ? value : [value];
  }, z.union([
    z.array(z.enum(BUSINESS_TYPES)).transform((values) => Array.from(new Set(values))),
    z.null(),
    z.undefined(),
  ]).refine((value) => {
    if (value === undefined || value === null) return true;
    return value.every((item) => BUSINESS_TYPES.includes(item));
  }, `${label}が不正です`));
}

function reservationStatusField() {
  return z.preprocess((value) => {
    const normalized = firstValue(value);
    if (normalized === 'チェックイン済') return '登園済';
    if (normalized === '退園済') return '降園済';
    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return normalized;
  }, z.union([
    z.string({ invalid_type_error: 'statusが不正です' })
      .refine((value): value is typeof RESERVATION_STATUSES[number] => RESERVATION_STATUSES.includes(value as typeof RESERVATION_STATUSES[number]), 'statusが不正です'),
    z.undefined(),
  ]));
}

const closedDaysField = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return Array.isArray(value) ? value : [value];
}, z.union([
  z.array(z.enum(CLOSED_DAY_KEYS)).transform((values) => Array.from(new Set(values))),
  z.null(),
  z.undefined(),
]));

const businessHoursField = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return value;
}, z.union([
  z.object({
    open: optionalNullableStringField('business_hours.open'),
    close: optionalNullableStringField('business_hours.close'),
  }).passthrough(),
  z.null(),
  z.undefined(),
]).superRefine((value, ctx) => {
  if (!value || typeof value !== 'object') return;
  const open = (value as { open?: string | null }).open;
  const close = (value as { close?: string | null }).close;
  if (open && !TIME_REGEX.test(open)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'business_hours.openが不正です' });
  }
  if (close && !TIME_REGEX.test(close)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'business_hours.closeが不正です' });
  }
}));

export const idParamSchema = z.object({
  id: requiredPositiveIntField('id'),
});

export const ownersListQuerySchema = z.object({
  search: z.preprocess((value) => {
    const normalized = firstValue(value);
    if (normalized === undefined || normalized === null) return undefined;
    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return normalized;
  }, z.union([z.string(), z.undefined()])),
  service_type: businessTypeField('service_type'),
});

export const ownerCreateSchema = z.object({
  name: requiredStringField('名前'),
  name_kana: nullableStringField('name_kana'),
  phone: requiredStringField('電話番号'),
  email: nullableStringField('email'),
  address: nullableStringField('address'),
  emergency_contact: nullableStringField('emergency_contact'),
  emergency_picker: nullableStringField('emergency_picker'),
  line_id: nullableStringField('line_id'),
  memo: nullableStringField('memo'),
  business_types: businessTypesField('business_types'),
});

export const ownerUpdateSchema = z.object({
  name: optionalNullableStringField('name'),
  name_kana: optionalNullableStringField('name_kana'),
  phone: optionalNullableStringField('phone'),
  email: optionalNullableStringField('email'),
  address: optionalNullableStringField('address'),
  emergency_contact: optionalNullableStringField('emergency_contact'),
  emergency_picker: optionalNullableStringField('emergency_picker'),
  line_id: optionalNullableStringField('line_id'),
  memo: optionalNullableStringField('memo'),
  business_types: businessTypesField('business_types'),
}).refine(hasDefinedFields, '更新する項目がありません');

export const reservationsListQuerySchema = z.object({
  date: optionalDateField('date'),
  month: optionalMonthField('month'),
  service_type: businessTypeField('service_type'),
});

export const reservationCreateSchema = z.object({
  dog_id: requiredPositiveIntField('dog_id'),
  reservation_date: requiredDateField('reservation_date'),
  reservation_time: requiredTimeField('reservation_time'),
  memo: nullableStringField('memo'),
  base_price: optionalNullableNumberField('base_price'),
  service_type: nullableBusinessTypeField('service_type'),
  service_details: z.preprocess((value) => value === undefined ? undefined : value, z.union([jsonValueSchema, z.undefined()])),
  end_datetime: optionalNullableDateTimeField('end_datetime'),
  room_id: optionalNullableIntField('room_id', 1),
});

export const reservationUpdateSchema = z.object({
  reservation_date: optionalDateField('reservation_date'),
  reservation_time: z.preprocess((value) => {
    const normalized = firstValue(value);
    if (normalized === undefined || normalized === null) return undefined;
    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return normalized;
  }, z.union([
    z.string({ invalid_type_error: 'reservation_timeが不正です' }).regex(TIME_REGEX, 'reservation_timeが不正です'),
    z.undefined(),
  ])),
  status: reservationStatusField(),
  memo: optionalNullableStringField('memo'),
  service_type: nullableBusinessTypeField('service_type'),
  service_details: z.preprocess((value) => value === undefined ? undefined : value, z.union([jsonValueSchema, z.null(), z.undefined()])),
  end_datetime: optionalNullableDateTimeField('end_datetime'),
  room_id: optionalNullableIntField('room_id', 1),
}).refine(hasDefinedFields, '更新する項目がありません');

export const contractsListQuerySchema = z.object({
  dog_id: z.preprocess((value) => {
    const normalized = firstValue(value);
    if (normalized === undefined || normalized === null) return undefined;
    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      if (!trimmed) return undefined;
      return Number(trimmed);
    }
    return normalized;
  }, z.union([
    z.number({ invalid_type_error: 'dog_idが不正です' }).int().positive('dog_idが不正です'),
    z.undefined(),
  ])),
});

const contractTypeField = z.preprocess((value) => {
  const normalized = firstValue(value);
  if (typeof normalized === 'string') {
    const trimmed = normalized.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return normalized;
}, z.string({
  required_error: 'contract_typeは必須です',
  invalid_type_error: 'contract_typeが不正です',
}).refine((value): value is typeof CONTRACT_TYPES[number] => CONTRACT_TYPES.includes(value as typeof CONTRACT_TYPES[number]), 'contract_typeが不正です'));

export const contractCreateSchema = z.object({
  dog_id: requiredPositiveIntField('dog_id'),
  contract_type: contractTypeField,
  course_name: nullableStringField('course_name'),
  total_sessions: optionalNullableIntField('total_sessions'),
  remaining_sessions: optionalNullableIntField('remaining_sessions'),
  valid_until: optionalNullableDateField('valid_until'),
  monthly_sessions: optionalNullableIntField('monthly_sessions'),
  price: optionalNullableNumberField('price'),
});

export const contractUpdateSchema = z.object({
  contract_type: z.preprocess((value) => {
    const normalized = firstValue(value);
    if (normalized === undefined || normalized === null) return undefined;
    if (typeof normalized === 'string') {
      const trimmed = normalized.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return normalized;
  }, z.union([z.enum(CONTRACT_TYPES), z.undefined()])),
  course_name: optionalNullableStringField('course_name'),
  total_sessions: optionalNullableIntField('total_sessions'),
  remaining_sessions: optionalNullableIntField('remaining_sessions'),
  valid_until: optionalNullableDateField('valid_until'),
  monthly_sessions: optionalNullableIntField('monthly_sessions'),
  price: optionalNullableNumberField('price'),
}).refine(hasDefinedFields, '更新する項目がありません');

export const storeUpdateSchema = z.object({
  name: optionalNullableStringField('name'),
  address: optionalNullableStringField('address'),
  phone: optionalNullableStringField('phone'),
  business_hours: businessHoursField,
  closed_days: closedDaysField,
  business_types: businessTypesField('business_types'),
  primary_business_type: nullableBusinessTypeField('primary_business_type'),
  line_channel_id: optionalNullableStringField('line_channel_id'),
  line_channel_secret: optionalNullableStringField('line_channel_secret'),
  line_channel_access_token: optionalNullableStringField('line_channel_access_token'),
}).refine(hasDefinedFields, '更新する項目がありません')
  .superRefine((value, ctx) => {
    if (
      Array.isArray(value.business_types)
      && value.primary_business_type
      && !value.business_types.includes(value.primary_business_type as BusinessType)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['primary_business_type'],
        message: 'primary_business_typeはbusiness_typesに含まれている必要があります',
      });
    }
  });

export function parseSchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  value: unknown,
): { success: true; data: z.infer<TSchema> } | { success: false; error: string } {
  const result = schema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.issues[0]?.message ?? '入力内容が不正です',
  };
}
