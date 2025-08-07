import { Routes } from '@angular/router';
import { authGuard, publicGuard, redirectGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/components/login').then(m => m.LoginComponent),
    canActivate: [publicGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    canActivate: [redirectGuard],
    children: []
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
