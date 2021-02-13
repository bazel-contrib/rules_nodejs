import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {Observable, of, ReplaySubject} from 'rxjs';

import {DocsInfo, PageMetadata, TocItem, VersionInfo} from './doc.types';
export * from './doc.types';

// @ts-ignore
import {DOCSINFO, VERSIONS} from './versions';

export interface VersionChangeEvent {
  version: string;
  info: VersionInfo;
}

export interface PageChangeEvent {
  toc: Array<TocItem>;
  page: string;
  meta: PageMetadata;
}

@Injectable({providedIn: 'root'})
export class DocsService {
  private static readonly VERSION_SCHEMA = 'pages/versions.json';

  // maps version number to the version info
  private info: Map<string, VersionInfo>;
  private versions: string[];

  private versionChnage$: ReplaySubject<VersionChangeEvent> = new ReplaySubject(1);
  private pageChange$: ReplaySubject<PageChangeEvent> = new ReplaySubject(1);

  constructor(private readonly router: Router) {}

  init(): void {
    const info: Array<[string, VersionInfo]> =
        Object.entries(DOCSINFO as DocsInfo).map(version => ([version[0], version[1]]));
    this.info = new Map(info);
    this.versions = VERSIONS;

    // the router will do the initial navigation after bootstrap
    // wait for the next VM turn
    setTimeout(() => {
      const parsed = this.parseUrl(this.router.url);
      if (parsed.version && this.info.has(parsed.version)) {
        this.emitChangeEvent(parsed.version);
      } else {
        this.emitChangeEvent(this.latest);
      }
    });
  }

  get versions$(): Observable<string[]> {
    return of(this.versions);
  }

  get latest(): string {
    return this.versions[1];
  }

  getPageMetadata(md: string, version = this.latest): PageMetadata|undefined {
    if (!this.info.has(version)) {
      return;
    }

    const info = this.info.get(version);
    let meta = info.navs.page.find(page => page.md === md);
    if (meta) {
      return meta;
    }

    return info.navs.rule.find(page => page.md === md);
  }

  onVersionSelect(): Observable<VersionChangeEvent> {
    return this.versionChnage$.asObservable();
  }

  onPageChange(): Observable<PageChangeEvent> {
    return this.pageChange$.asObservable();
  }

  selectVersion(version: string): Promise<boolean> {
    if (!this.info.has(version)) {
      return Promise.resolve(false);
    }

    const next = ['/', 'docs', version];
    const parsed = this.parseUrl(this.router.url);

    if (parsed.doc) {
      next.push(parsed.doc);
    }

    this.router.navigate(next).then(hasNavigated => {
      if (!hasNavigated) {
        return;
      }
      this.emitChangeEvent(version);
      return true;
    });
  }

  changePage(page: string, version: string, toc: TocItem[]) {
    const meta = this.getPageMetadata(page, version);
    this.pageChange$.next({page, toc, meta});
  }

  private parseUrl(url: string): {version: string, doc: string} {
    const parsed = {version: null, doc: null};
    if (url.startsWith('/docs/')) {
      const segments = url.split('/');
      // /version/:version/:doc
      // but only if we have a :doc
      parsed.version = segments[2];
      parsed.doc = segments[3];
    }
    return parsed;
  }

  private emitChangeEvent(version: string): void {
    this.versionChnage$.next({version, info: this.info.get(version)});
  }
}
