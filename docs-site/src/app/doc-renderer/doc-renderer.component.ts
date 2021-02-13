import {ViewportScroller} from '@angular/common';
import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MarkdownService} from 'ngx-markdown';
import {Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';

import {DocsService, TocItem} from '../docs.service';

@Component({
  selector: 'app-doc-renderer',
  templateUrl: './doc-renderer.component.html',
  styleUrls: ['./doc-renderer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocRendererComponent implements OnInit {
  private static readonly URL_PREFIX = 'pages';

  url$: Observable<string>;

  private toc: TocItem[] = [];

  constructor(
      private readonly route: ActivatedRoute, private readonly router: Router,
      private readonly viewportScroller: ViewportScroller, private readonly doc: DocsService,
      private readonly markdownService: MarkdownService) {}

  ngOnInit(): void {
    this.markdownService.renderer.heading = (text: string, level: number) => {
      let h = `h${level} `;

      if (text.startsWith('.')) {
        const endOfCss = text.indexOf(' ');
        const css = text.substring(1, endOfCss).split('.').join(' ');
        h += `class="${css}"`;
        text = text.substring(endOfCss + 1);
      }

      if (level === 1 || level > 3) {
        return `<${h}>${text}</h${level}>`;
      }

      const htmlStrippedText = text.replace(/(<([^>]+)>)/g, '');
      const escapedText = htmlStrippedText.toLowerCase().replace(/[^\w]+/g, '_');
      const href = `${window.location.pathname}#${escapedText}`;
      this.toc.push({text: htmlStrippedText, escapedText, level, href});

      return `<${h} id="${escapedText}">` +
          `<a name="${escapedText}" class="anchor" href="${href}"></a>` + text + `</h${level}>`;
    };

    this.url$ = this.route.paramMap.pipe(
        map(params => {
          let version = params.get('version') ?? this.doc.latest;
          if (version === 'latest') {
            version = this.doc.latest;
          }

          if (!params.has('doc')) {
            return `${DocRendererComponent.URL_PREFIX}/${version}/index.md`;
          }

          const page = params.get('doc');
          const meta = this.doc.getPageMetadata(page, version);
          if (!meta) {
            // 404
            this.router.navigate(['/', '404.html'], {skipLocationChange: true});
          }
          return `${DocRendererComponent.URL_PREFIX}/${version}/${page}.md`;
        }),
        tap(_ => this.toc = []));
  }

  onReady() {
    this.doc.changePage(
        this.route.snapshot.paramMap.get('doc') ?? 'index',
        this.route.snapshot.paramMap.get('version') ?? this.doc.latest, this.toc);

    // even though the markdown component emits 'ready' the content may have not rendered :/
    // so wait a bit before trying to scroll
    const anchor = window.location.hash;
    if (anchor) {
      setTimeout(() => this.viewportScroller.scrollToAnchor(anchor.substr(1)), 100);
    }
  }
}
