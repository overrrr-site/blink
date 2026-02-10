import { isBusinessType } from './businessTypes.js';
import { isNonEmptyString, isNumberLike } from './validation.js';

const HOTEL_CARE_LOG_CATEGORIES = new Set(['feeding', 'medication', 'toilet', 'walk']);

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateHotelData(hotelData: unknown): string | undefined {
  if (hotelData === undefined || hotelData === null) {
    return undefined;
  }

  if (!isRecordObject(hotelData)) {
    return 'hotel_dataが不正です';
  }

  const careLogs = hotelData.care_logs;
  if (careLogs === undefined || careLogs === null) {
    return undefined;
  }

  if (!Array.isArray(careLogs)) {
    return 'hotel_data.care_logsは配列である必要があります';
  }

  for (const [index, careLog] of careLogs.entries()) {
    if (!isRecordObject(careLog)) {
      return `hotel_data.care_logs[${index}]が不正です`;
    }

    const at = careLog.at;
    const category = careLog.category;
    const note = careLog.note;
    const staff = careLog.staff;

    if (!isNonEmptyString(at)) {
      return `hotel_data.care_logs[${index}].atが不正です`;
    }
    if (!isNonEmptyString(category) || !HOTEL_CARE_LOG_CATEGORIES.has(category)) {
      return `hotel_data.care_logs[${index}].categoryが不正です`;
    }
    if (!isNonEmptyString(note)) {
      return `hotel_data.care_logs[${index}].noteが不正です`;
    }
    if (staff !== undefined && staff !== null && typeof staff !== 'string') {
      return `hotel_data.care_logs[${index}].staffが不正です`;
    }
  }

  return undefined;
}

function validateGroomingData(groomingData: unknown): string | undefined {
  if (groomingData === undefined || groomingData === null) {
    return undefined;
  }

  if (!isRecordObject(groomingData)) {
    return 'grooming_dataが不正です';
  }

  const counseling = groomingData.counseling;
  if (counseling !== undefined && counseling !== null) {
    if (!isRecordObject(counseling)) {
      return 'grooming_data.counselingが不正です';
    }

    const styleRequest = counseling.style_request;
    const cautionNotes = counseling.caution_notes;
    const conditionNotes = counseling.condition_notes;
    const consentConfirmed = counseling.consent_confirmed;

    if (styleRequest !== undefined && styleRequest !== null && typeof styleRequest !== 'string') {
      return 'grooming_data.counseling.style_requestが不正です';
    }
    if (cautionNotes !== undefined && cautionNotes !== null && typeof cautionNotes !== 'string') {
      return 'grooming_data.counseling.caution_notesが不正です';
    }
    if (conditionNotes !== undefined && conditionNotes !== null && typeof conditionNotes !== 'string') {
      return 'grooming_data.counseling.condition_notesが不正です';
    }
    if (consentConfirmed !== undefined && consentConfirmed !== null && typeof consentConfirmed !== 'boolean') {
      return 'grooming_data.counseling.consent_confirmedが不正です';
    }
  }

  const preVisit = groomingData.pre_visit;
  if (preVisit !== undefined && preVisit !== null) {
    if (!isRecordObject(preVisit)) {
      return 'grooming_data.pre_visitが不正です';
    }

    const pickupTime = preVisit.pickup_time;
    const completionContact = preVisit.completion_contact;
    const dayOfNotes = preVisit.day_of_notes;

    if (pickupTime !== undefined && pickupTime !== null && typeof pickupTime !== 'string') {
      return 'grooming_data.pre_visit.pickup_timeが不正です';
    }
    if (
      completionContact !== undefined
      && completionContact !== null
      && !['line', 'phone', 'none'].includes(String(completionContact))
    ) {
      return 'grooming_data.pre_visit.completion_contactが不正です';
    }
    if (dayOfNotes !== undefined && dayOfNotes !== null && typeof dayOfNotes !== 'string') {
      return 'grooming_data.pre_visit.day_of_notesが不正です';
    }
  }

  return undefined;
}

export function validateCreateRecordPayload(payload: Record<string, unknown>): { ok: boolean; error?: string } {
  const dogId = payload.dog_id;
  const recordType = payload.record_type;
  const recordDate = payload.record_date;

  if (!isNumberLike(dogId) || !isNonEmptyString(recordType) || !isNonEmptyString(recordDate)) {
    return { ok: false, error: '必須項目が不足しています（dog_id, record_type, record_date）' };
  }

  if (!isBusinessType(recordType)) {
    return { ok: false, error: 'record_typeが不正です' };
  }

  const hotelDataError = validateHotelData(payload.hotel_data);
  if (hotelDataError) {
    return { ok: false, error: hotelDataError };
  }

  const groomingDataError = validateGroomingData(payload.grooming_data);
  if (groomingDataError) {
    return { ok: false, error: groomingDataError };
  }

  return { ok: true };
}

export function validateUpdateRecordPayload(payload: Record<string, unknown>): { ok: boolean; error?: string; recordType?: string } {
  const recordType = payload.record_type;
  if (recordType !== undefined && !isBusinessType(recordType)) {
    return { ok: false, error: 'record_typeが不正です' };
  }

  const hotelDataError = validateHotelData(payload.hotel_data);
  if (hotelDataError) {
    return { ok: false, error: hotelDataError };
  }

  const groomingDataError = validateGroomingData(payload.grooming_data);
  if (groomingDataError) {
    return { ok: false, error: groomingDataError };
  }

  return { ok: true, recordType: recordType as string | undefined };
}
