import {ApplicationRef, Injectable, Inject, PLATFORM_ID} from '@angular/core';
import {SwUpdate} from '@angular/service-worker';
import {concat, interval} from 'rxjs';
import {first} from 'rxjs/operators';
import {isPlatformBrowser} from '@angular/common';

@Injectable()
export class ServiceWorkerService {
  constructor(
    private appRef: ApplicationRef,
    private swUpdate: SwUpdate,
    @Inject(PLATFORM_ID) private platform: string
  ) {}

  launchUpdateCheckingRoutine(checkIntervaSeconds: number = 6 * 60 * 60) {
    if (!this.isAvailable()) return;

    const timeInterval$ = concat(
      this.appRef.isStable.pipe(first((isStable) => !!isStable)),
      interval(checkIntervaSeconds * 1000)
    );

    timeInterval$.subscribe(() => this.swUpdate.checkForUpdate());
    this.swUpdate.available.subscribe(() => this.forceUpdateNow());
  }

  private forceUpdateNow() {
    this.swUpdate.activateUpdate().then(() => document.location.reload());
  }

  private isAvailable() {
    return isPlatformBrowser(this.platform) && this.swUpdate.isEnabled;
  }
}
