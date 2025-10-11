import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, AbstractControl, ValidationErrors } from '@angular/forms';
import { debounceTime, forkJoin } from 'rxjs';
import { NotificationComponent, NotificationData } from '../../shared/components/notification/notification.component';
import { DashboardService } from './services/dashboard.service';
import { ChartResponseDto } from './models/chart.models';
import { LineChartComponent } from './components/charts/line-chart/line-chart.component';
import { BarChartComponent } from './components/charts/bar-chart/bar-chart.component';
import { DoughnutChartComponent } from './components/charts/doughnut-chart/doughnut-chart.component';
import { CatalogService } from '../../core/services/catalog.service'
import { InstitutionService } from '../institutions/services/institution.service'
import { MunicipioSanitario } from '../../core/models/catalog/municipio-sanitario.interface'
import { Institucion } from '../../core/models/catalog/institucion.interface'

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NotificationComponent, LineChartComponent, BarChartComponent, DoughnutChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements AfterViewInit {

  // Reactive form para filtros
  filterForm!: FormGroup;
  activeFilterForm!: FormGroup; // nuevo formulario separado para gráficos de activos
  notification: NotificationData | null = null;

  // Inyecciones de servicios
  private readonly catalogService = inject(CatalogService);
  private readonly institutionService = inject(InstitutionService);

  // Catálogos (nuevas fuentes reales)
  municipiosSanitarios: MunicipioSanitario[] = []
  instituciones: Institucion[] = []
  readonly municipios: string[] = ['Maracaibo', 'San Francisco', 'Machiques', 'Lagunillas', 'Colón'];
  readonly institucionesPorMunicipio: Record<string, string[]> = {
    'Maracaibo': ['Hospital Universitario', 'Clínica Maracaibo', 'Ambulatorio La Paz'],
    'San Francisco': ['Centro de Salud San Francisco'],
    'Machiques': ['Hospital de Machiques'],
    'Lagunillas': ['Hospital de Lagunillas'],
    'Colón': ['Hospital Central del Zulia']
  };
  institutionOptions: string[] = [];

  // Lista de meses y años para selects
  readonly MONTHS: { value: string; label: string }[] = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ];
  years: number[] = [];

  // Estado de datos para subcomponentes de gráficos
  consultasData: ChartResponseDto | null = null;
  institucionesData: ChartResponseDto | null = null;
  usuariosInstitucionData: ChartResponseDto | null = null;
  etarioData: ChartResponseDto | null = null;
  estadoData: ChartResponseDto | null = null;
  loading: boolean = false;
  loadingActive: boolean = false; // estado de carga independiente para activos
  // Paleta basada en Bootstrap
  private readonly COLORS = {
    primary: '#0d6efd',
    success: '#198754',
    warning: '#ffc107',
    info: '#0dcaf0',
    danger: '#dc3545',
    secondary: '#6c757d'
  };

  constructor(private fb: FormBuilder, private dashboardService: DashboardService) {
    const defaultStart = this.formatMonth(this.monthsAgo(5));
    const defaultEnd = this.formatMonth(new Date());
    const dsDate = this.parseMonth(defaultStart);
    const deDate = this.parseMonth(defaultEnd);
    const dsMonthPart = (dsDate.getMonth() + 1).toString().padStart(2, '0');
    const deMonthPart = (deDate.getMonth() + 1).toString().padStart(2, '0');

    // Generar años desde 2018 hasta el año actual (descendente)
    this.years = this.generateYears(2018, new Date().getFullYear());

    this.filterForm = this.fb.group({
      startMonth: [defaultStart],
      endMonth: [defaultEnd],
      startMonthOnly: [dsMonthPart],
      startYear: [dsDate.getFullYear()],
      endMonthOnly: [deMonthPart],
      endYear: [deDate.getFullYear()],
      municipio: [''],
      institucion: ['']
    }, { validators: [this.monthRangeValidator.bind(this)] });
    this.institutionOptions = this.getInstitucionesList('Todos');

    // Inicializar formulario de filtros para gráficos de activos
    this.activeFilterForm = this.fb.group({
      activoMunicipioId: ['']
    });
  }

  ngAfterViewInit(): void {
    // Uso de subcomponentes y datos del servicio
    this.initializeFilterSubscriptions();
    this.applyFilters();

    // Cargar lista de municipios sanitarios (IDs y nombres reales)
    this.catalogService.getHealthMunicipalities().subscribe({
      next: (municipios: MunicipioSanitario[]) => {
        this.municipiosSanitarios = municipios
      },
      error: (err: unknown) => {
        console.error('Error al cargar municipios sanitarios', err)
        this.notification = { type: 'error', message: 'No se pudieron cargar los municipios sanitarios.' }
      }
    })

    // Inicializar filtros independientes para gráficos de activos
    this.initializeActiveFilterSubscriptions();
    this.applyActiveFilters();
  }

  // ---------- Filtros ----------
  private initializeFilterSubscriptions(): void {
    // Actualizar valores combinados cuando cambien los selects de mes/año
    this.filterForm.get('startMonthOnly')!.valueChanges.subscribe(() => this.updateCombinedMonth('start'));
    this.filterForm.get('startYear')!.valueChanges.subscribe(() => this.updateCombinedMonth('start'));
    this.filterForm.get('endMonthOnly')!.valueChanges.subscribe(() => this.updateCombinedMonth('end'));
    this.filterForm.get('endYear')!.valueChanges.subscribe(() => this.updateCombinedMonth('end'));

    // Cambios en municipio: cargar instituciones por municipio y habilitar/deshabilitar instituciones
    this.filterForm.get('municipio')!.valueChanges.subscribe((munRaw) => {
      const instCtrl = this.filterForm.get('institucion')!;
      const munId = typeof munRaw === 'string' ? Number(munRaw) : ((munRaw as number | null) ?? 0);

      if (munId > 0) {
        instCtrl.enable({ emitEvent: false });
        this.institutionService.getInstitutionsByMunicipioSanitario(munId).subscribe({
          next: (resp: unknown) => {
            const insts = Array.isArray(resp) ? (resp as Institucion[]) : (((resp as { data?: Institucion[] }).data) ?? []);
            this.instituciones = insts ?? [];

            const current = instCtrl.value as string | number | null;
            const exists = !!insts.find(i => String(i.id) === String(current));
            if (!exists) {
              instCtrl.setValue('', { emitEvent: false });
            }
          },
          error: (e: unknown) => {
            console.error('Error al cargar instituciones por municipio', e);
            this.instituciones = [];
            instCtrl.setValue('', { emitEvent: false });
          }
        });
      } else {
        instCtrl.disable({ emitEvent: false });
        instCtrl.setValue('', { emitEvent: false });
        this.instituciones = [];
      }
    });

    // Cambios generales: aplicar con debounce
    this.filterForm.valueChanges.pipe(debounceTime(250)).subscribe(() => this.applyFilters());
  }

  applyFilters(): void {
    if (!this.filterForm.valid) {
      if (this.filterForm.errors?.['monthRange']) {
        this.notification = {
          type: 'error',
          title: 'Rango de fechas inválido',
          message: 'El mes de inicio debe ser menor que el mes de fin.',
          dismissible: true,
          autoClose: false
        };
      }
      return;
    }

    // Si el formulario es válido, limpiar notificación previa
    if (this.notification) { this.notification = null; }

    const { startMonth, endMonth } = this.filterForm.value as { startMonth: string; endMonth: string };

    // Enviar IDs reales al servicio
    const munRaw = this.filterForm.get('municipio')!.value as string | number | null;
    const instRaw = this.filterForm.get('institucion')!.value as string | number | null;
    const municipioId = typeof munRaw === 'string' ? Number(munRaw) : (munRaw ?? undefined);
    const institucionId = typeof instRaw === 'string' ? Number(instRaw) : (instRaw ?? undefined);

    this.fetchMainCharts(
      startMonth,
      endMonth,
      municipioId && municipioId > 0 ? municipioId : undefined,
      institucionId && institucionId > 0 ? institucionId : undefined
    );
  }

  get isInstitutionEnabled(): boolean {
    const munRaw = this.filterForm.get('municipio')!.value as string | number | null;
    const munId = typeof munRaw === 'string' ? Number(munRaw) : (munRaw ?? 0);
    return munId > 0;
  }

  private fetchCharts(startMonth: string, endMonth: string, municipioId?: number | null, institucionId?: number | null): void {
    this.loading = true;

    const consultas$ = this.dashboardService.getConsultasPorMes(startMonth, endMonth, municipioId ?? undefined, institucionId ?? undefined);
    const etario$ = this.dashboardService.getDistribucionGrupoEtario(startMonth, endMonth, institucionId ?? undefined);
    const estado$ = this.dashboardService.getEstadoNutricionalPorGrupoEtario(startMonth, endMonth, institucionId ?? undefined);

    forkJoin({ consultas: consultas$, etario: etario$, estado: estado$ }).subscribe({
      next: ({ consultas, etario, estado }) => {
        this.consultasData = consultas;
        this.etarioData = etario;
        this.estadoData = estado;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando gráficos', err);
        this.notification = {
          type: 'error',
          message: 'Ocurrió un error cargando los datos del dashboard. Intente nuevamente.'
        };
        this.loading = false;
      }
    });
  }

  onNotificationDismiss(): void { this.notification = null; }

  private getInstitucionesList(municipio: string | string[]): string[] {
    if (Array.isArray(municipio)) {
      if (municipio.length === 1) {
        const m = municipio[0];
        return this.institucionesPorMunicipio[m] ?? [];
      }
      const all = municipio.flatMap(m => this.institucionesPorMunicipio[m] ?? []);
      return Array.from(new Set(all));
    }
    if (municipio === 'Todos') {
      const all = Object.values(this.institucionesPorMunicipio).flat();
      return Array.from(new Set(all));
    }
    return this.institucionesPorMunicipio[municipio] ?? [];
  }

  private formatMonth(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
  }

  private monthsAgo(n: number): Date {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return d;
  }

  private parseMonth(value: string): Date {
    const [y, m] = value.split('-').map(Number);
    return new Date(y, m - 1, 1);
  }

  private updateCombinedMonth(which: 'start' | 'end'): void {
    const yearCtrl = this.filterForm.get(which === 'start' ? 'startYear' : 'endYear');
    const monthCtrl = this.filterForm.get(which === 'start' ? 'startMonthOnly' : 'endMonthOnly');
    if (!yearCtrl || !monthCtrl) { return; }
    const y = yearCtrl.value as number | null;
    const m = monthCtrl.value as string | null;
    if (!y || !m) { return; }
    const combined = `${y}-${m}`;
    const targetCtrl = this.filterForm.get(which === 'start' ? 'startMonth' : 'endMonth');
    targetCtrl?.setValue(combined);
  }

  private generateYears(start: number, end: number): number[] {
    const arr: number[] = [];
    for (let y = end; y >= start; y--) { arr.push(y); }
    return arr;
  }

  private monthLabelsBetween(start: string, end: string): string[] {
    let s = this.parseMonth(start);
    let e = this.parseMonth(end);
    if (s > e) { const tmp = s; s = e; e = tmp; }
    const labels: string[] = [];
    const fmt = new Intl.DateTimeFormat('es-VE', { month: 'short' });
    const d = new Date(s);
    while (d <= e) {
      labels.push(fmt.format(d));
      d.setMonth(d.getMonth() + 1);
    }
    return labels;
  }

  private hashToNumber(text: string): number {
    let h = 0;
    for (let i = 0; i < text.length; i++) { h = (h << 5) - h + text.charCodeAt(i); h |= 0; }
    return Math.abs(h);
  }

  // Validator para rango de meses
  private monthRangeValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startMonth')?.value as string | undefined;
    const end = group.get('endMonth')?.value as string | undefined;
    if (!start || !end) { return null; }
    return this.parseMonth(start) < this.parseMonth(end) ? null : { monthRange: true };
  }

  private formatPeriodTitle(start: string, end: string): string {
    const fmt = new Intl.DateTimeFormat('es-VE', { month: 'short', year: 'numeric' });
    const s = fmt.format(this.parseMonth(start));
    const e = fmt.format(this.parseMonth(end));
    return `${s} - ${e}`;
  }

  // trackBy para listas por ID
  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  private initializeActiveFilterSubscriptions(): void {
    this.activeFilterForm.valueChanges.pipe(debounceTime(250)).subscribe(() => this.applyActiveFilters());
  }

  applyActiveFilters(): void {
    const activoMunRaw = this.activeFilterForm.get('activoMunicipioId')!.value as string | number | null;
    const activoMunicipioId = typeof activoMunRaw === 'string' ? Number(activoMunRaw) : (activoMunRaw ?? undefined);
    this.fetchActiveCharts(activoMunicipioId && activoMunicipioId > 0 ? activoMunicipioId : undefined);
  }

  private fetchMainCharts(startMonth: string, endMonth: string, municipioId?: number | null, institucionId?: number | null): void {
    this.loading = true;

    const consultas$ = this.dashboardService.getConsultasPorMes(startMonth, endMonth, municipioId ?? undefined, institucionId ?? undefined);
    const etario$ = this.dashboardService.getDistribucionGrupoEtario(startMonth, endMonth, institucionId ?? undefined);
    const estado$ = this.dashboardService.getEstadoNutricionalPorGrupoEtario(startMonth, endMonth, institucionId ?? undefined);

    forkJoin({ consultas: consultas$, etario: etario$, estado: estado$ }).subscribe({
      next: ({ consultas, etario, estado }) => {
        this.consultasData = consultas;
        this.etarioData = etario;
        this.estadoData = estado;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando gráficos principales', err);
        this.notification = {
          type: 'error',
          message: 'Ocurrió un error cargando los datos del dashboard. Intente nuevamente.'
        };
        this.loading = false;
      }
    });
  }

  private fetchActiveCharts(municipioId?: number | null): void {
    this.loadingActive = true;

    const instituciones$ = this.dashboardService.getInstitucionesActivasPorMunicipio(municipioId ?? undefined);
    const usuarios$ = this.dashboardService.getUsuariosActivosPorInstitucion(municipioId ?? undefined);

    forkJoin({ instituciones: instituciones$, usuarios: usuarios$ }).subscribe({
      next: ({ instituciones, usuarios }) => {
        this.institucionesData = instituciones;
        this.usuariosInstitucionData = usuarios;
        this.loadingActive = false;
      },
      error: (err) => {
        console.error('Error cargando gráficos de activos', err);
        this.notification = {
          type: 'error',
          message: 'Ocurrió un error cargando los gráficos de activos. Intente nuevamente.'
        };
        this.loadingActive = false;
      }
    });
  }
}
