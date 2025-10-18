import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../core/constants/api-endpoints';
import { getApiUrl } from '../../core/config';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './help.component.html',
  styleUrl: './help.component.css'
})
export class HelpComponent {
  appName = environment.appName;

  // URLs centralizadas desde el backend
  downloads = {
    webManualUrl: getApiUrl(API_ENDPOINTS.PUBLIC.MANUAL_WEB),
    appWebManualUrl: getApiUrl(API_ENDPOINTS.PUBLIC.MANUAL_APP),
    apkUrl: getApiUrl(API_ENDPOINTS.PUBLIC.APK),
    qrImageUrl: '/qr.png'
  };
}
