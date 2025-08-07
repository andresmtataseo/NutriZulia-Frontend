import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/components/user-list/user-list.component').then(m => m.UserListComponent)
      },
      {
        path: 'institutions',
        loadComponent: () => import('./features/institutions/components/institution-list/institution-list.component').then(m => m.InstitutionListComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/components/report-list/report-list.component').then(m => m.ReportListComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
