import pool from '../db/connection.js';

export type ExportType = 'records' | 'reservations';
export type ExportOutputFormat = 'csv' | 'print';

interface LogExportActionInput {
  storeId: number;
  staffId?: number;
  exportType: ExportType;
  outputFormat: ExportOutputFormat;
  filters?: unknown;
}

export async function logExportAction(input: LogExportActionInput): Promise<void> {
  await pool.query(
    `INSERT INTO export_logs (store_id, staff_id, export_type, output_format, filters)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      input.storeId,
      input.staffId ?? null,
      input.exportType,
      input.outputFormat,
      input.filters ? JSON.stringify(input.filters) : null,
    ]
  );
}
