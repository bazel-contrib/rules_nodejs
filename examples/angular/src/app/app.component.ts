import {Component} from '@angular/core';

import { ServiceWorkerService } from './service-worker.service';

@Component({selector: 'app-component', templateUrl: 'app.component.html'})
export class AppComponent {
  constructor(private swService: ServiceWorkerService) {
    this.swService.launchUpdateCheckingRoutine()
  }
}
