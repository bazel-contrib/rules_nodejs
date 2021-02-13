import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {PageMetadata} from './doc.types';
import {DocsService} from './docs.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  now = new Date();
  meta$: Observable<PageMetadata>;
  version$: Observable<string>;

  constructor(private readonly docs: DocsService) {}

  ngOnInit(): void {
    this.meta$ = this.docs.onPageChange().pipe(map(event => event.meta));

    this.version$ = this.docs.onVersionSelect().pipe(map(event => event.version));
  }
}
