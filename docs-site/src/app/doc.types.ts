export interface PageMetadata {
  title: string;
  md: string;
  nav?: string;
  toc?: boolean;
  ordinality?: number;
}

export interface VersionInfo {
  version: string;
  navs: {page: PageMetadata[]; rule: PageMetadata[];}
}

export interface DocsInfo {
  [version: string]: VersionInfo;
}

export interface TocItem {
  text: string;
  escapedText: string;
  level: number;
  href: string;
}
