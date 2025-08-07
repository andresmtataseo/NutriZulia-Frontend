export interface Report {
  id: string;
  title: string;
  type: ReportType;
  description?: string;
  parameters: ReportParams;
  status: ReportStatus;
  filePath?: string;
  createdAt: Date;
  completedAt?: Date;
  createdBy: string;
}

export enum ReportType {
  NUTRITIONAL_ASSESSMENT = 'nutritional_assessment',
  INSTITUTION_SUMMARY = 'institution_summary',
  USER_ACTIVITY = 'user_activity',
  CUSTOM = 'custom'
}

export enum ReportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ReportParams {
  dateFrom?: Date;
  dateTo?: Date;
  institutionId?: string;
  userId?: string;
  [key: string]: any;
}

export interface GenerateReportRequest {
  title: string;
  type: ReportType;
  description?: string;
  parameters: ReportParams;
}