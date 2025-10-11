export interface ChartSeriesDto {
  label: string;
  data: number[];
  color: string;
}

export interface ChartResponseDto {
  title: string;
  labels: string[];
  series: ChartSeriesDto[];
}