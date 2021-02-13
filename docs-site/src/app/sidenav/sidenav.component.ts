import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';

import {DocsService, VersionInfo} from '../docs.service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidenavComponent implements OnInit {
  versions$: Observable<string[]>;
  info$: Observable<VersionInfo['navs']>;
  selectedVesion$: Observable<string>;

  latest: string;
  isSidebarClosed = true;

  constructor(private readonly docs: DocsService) {}

  ngOnInit(): void {
    this.versions$ = this.docs.versions$;
    this.latest = this.docs.latest;

    this.info$ = this.docs.onVersionSelect().pipe(map(event => event.info.navs));

    this.selectedVesion$ =
        this.docs.onVersionSelect().pipe(map(event => event.version), startWith(this.latest));
  }

  onVersionSelect(selectedVersion) {
    this.docs.selectVersion(selectedVersion);
  }
}
