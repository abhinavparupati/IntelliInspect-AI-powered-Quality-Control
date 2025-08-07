export interface DatasetMetadata {
  recordCount: number;
  columnCount: number;
  startDate: string;
  endDate: string;
  passRate: number;
  passCount: number;
  failCount: number;
  fileName: string;
  uploadedAt: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface DateRanges {
  training: DateRange;
  testing: DateRange;
  simulation: DateRange;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  message?: string;
  dataDistribution?: DataDistribution;
}

export interface DataDistribution {
  trainingRecords: number;
  testingRecords: number;
  simulationRecords: number;
  monthlyDistribution: MonthlyData[];
}

export interface MonthlyData {
  month: string; // Format: "2024-01"
  monthName: string; // Format: "Jan 2024"
  trainingCount: number;
  testingCount: number;
  simulationCount: number;
  totalCount: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: {
    truePositive: number;
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
  };
  trainingHistory: {
    epochs: number[];
    accuracy: number[];
    loss: number[];
  };
}

export interface PredictionResult {
  sampleId: string; // Sample ID as first field
  timestamp: string;
  prediction: 'Pass' | 'Fail';
  confidence: number;
  actualResponse?: string;
  features?: { [key: string]: any };
}

export interface SimulationStatus {
  isRunning: boolean;
  totalPredictions: number;
  passCount: number;
  failCount: number;
  averageConfidence: number;
  expectedCount?: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    fill?: boolean;
  }[];
}
