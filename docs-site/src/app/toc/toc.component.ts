import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';

import {DocsService, TocItem} from '../docs.service';

@Component({
  selector: 'app-toc',
  templateUrl: './toc.component.html',
  styleUrls: ['./toc.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TocComponent implements OnInit {
  toc$: Observable<TocItem[]>;

  constructor(private readonly doc: DocsService) {}

  ngOnInit(): void {
    this.toc$ = this.doc.onPageChange().pipe(
        map(event => event.toc),
        startWith([]),
    );
  }
}
