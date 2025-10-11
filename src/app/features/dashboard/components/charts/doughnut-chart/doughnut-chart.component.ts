import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { ChartResponseDto } from '../../../models/chart.models';

@Component({
  selector: 'app-doughnut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas #canvas></canvas>
  `,
  styles: [`
    :host { display: block; }
    /* El canvas define su altura fija; el contenedor card se ajusta automáticamente */
    canvas { width: 100% !important; height: 320px !important; display: block; }
  `]
})
export class DoughnutChartComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() data!: ChartResponseDto | null;
  @Input() labelFormatter?: (label: string) => string;

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['data'] || changes['labelFormatter']) && this.chart) {
      this.update();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private mapLabel(label: string): string {
    if (this.labelFormatter) {
      try { return this.labelFormatter(label); } catch { /* noop */ }
    }
    const map: Record<string, string> = {
      LT2: '<2 años años',
      A2_6: '2–6 años',
      A7_12: '7–12 años',
      A13_18: '13–18 años',
      A19_59: '19–59 años',
      GTE60: '≥60 años'
    };
    return map[label] ?? label;
  }

  private render(): void {
    if (!this.canvasRef || !this.data) return;

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: this.data.labels.map(l => this.mapLabel(l)),
        datasets: [{
          label: this.data.title,
          data: this.data.series[0]?.data ?? [],
          backgroundColor: this.data.labels.map(l => this.mapColor(l))
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              title: (items) => items.length ? (items[0].label ?? '') : '',
              label: (ctx) => `${ctx.label}: ${ctx.parsed}`
            }
          }
        }
      }
    };

    this.chart = new Chart(this.canvasRef.nativeElement, config);
  }

  private update(): void {
    if (!this.chart || !this.data) return;

    this.chart.data.labels = this.data.labels.map(l => this.mapLabel(l));
    const dataset = this.chart.data.datasets[0];
    if (dataset) {
      dataset.data = this.data.series[0]?.data ?? [];
      (dataset as any).backgroundColor = this.data.labels.map(l => this.mapColor(l));
    }

    // actualizar tooltip
    if (this.chart.options?.plugins?.tooltip) {
      (this.chart.options.plugins.tooltip as any).callbacks = {
        title: (items: any[]) => items.length ? (items[0].label ?? '') : '',
        label: (ctx: any) => `${ctx.label}: ${ctx.parsed}`
      };
    }

    this.chart.update();
  }

  private mapColor(bucket: string): string {
    switch (bucket) {
      case 'LT2': return '#2a9d8f';
      case 'A2_6': return '#e9c46a';
      case 'A7_12': return '#a8dadc';
      case 'A13_18': return '#f4a261';
      case 'A19_59': return '#e76f51';
      case 'GTE60': return '#264653';
      default: return '#6c757d';
    }
  }
}
