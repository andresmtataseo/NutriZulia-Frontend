import { Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { ChartResponseDto } from '../../../models/chart.models';

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas #canvas></canvas>
  `,
  styles: [`
    :host { display: block; }
    canvas { width: 100% !important; height: 320px !important; }
  `]
})
export class LineChartComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @Input() data!: ChartResponseDto | null;

  private chart?: Chart;

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.chart) {
      this.update();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    if (!this.canvasRef || !this.data) return;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.data.labels,
        datasets: this.data.series.map(s => ({
          label: s.label,
          data: s.data,
          borderColor: s.color,
          backgroundColor: s.color,
          tension: 0.3
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          x: { display: true },
          y: { display: true }
        }
      }
    };

    this.chart = new Chart(this.canvasRef.nativeElement, config);
  }

  private update(): void {
    if (!this.chart || !this.data) return;

    this.chart.data.labels = this.data.labels;
    this.chart.data.datasets = this.data.series.map(s => ({
      label: s.label,
      data: s.data,
      borderColor: s.color,
      backgroundColor: s.color,
      tension: 0.3
    }));
    this.chart.update();
  }
}
