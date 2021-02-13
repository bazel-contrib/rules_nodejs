import {Component, Injectable, NgModule} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivate, Route, Router, RouterModule, RouterStateSnapshot, Routes, UrlMatchResult, UrlSegment, UrlSegmentGroup} from '@angular/router';

import {DocRendererComponent} from './doc-renderer/doc-renderer.component';
import {NotFoundComponent} from './not-found/not-found.component';

@Component({template: ''})
export class EmptyComponent {
}

export function HtmlPageUrlMatcher(
    segments: UrlSegment[], group: UrlSegmentGroup, route: Route): UrlMatchResult {
  return segments.length === 1 && segments[0].path.endsWith('.html') ? ({consumed: segments}) :
                                                                       null;
}

@Injectable()
export class HtmlRouteRedirectGuard implements CanActivate {
  constructor(private readonly router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (route.url.length !== 1) {
      // we shouldn't get here, but incase we do, don't allow it
      return false;
    }

    // get the url segment, transform the Foo.html path into Foo
    const file = route.url[0].path;
    const parts = file.split('.');
    parts.pop();

    // previous docs was always 'latest' (not HEAD), redirect there
    this.router.navigate(['/', 'docs', 'latest', parts.join('.')]);

    // whatever, we never get here
    return false;
  }
}

const routes: Routes = [
  {path: '404.html', component: NotFoundComponent},
  {component: EmptyComponent, canActivate: [HtmlRouteRedirectGuard], matcher: HtmlPageUrlMatcher},
  {path: '', pathMatch: 'full', redirectTo: 'docs/latest'},
  {path: 'docs/:version', component: DocRendererComponent},
  {path: 'docs/:version/:doc', component: DocRendererComponent},
  {path: '**', component: NotFoundComponent}
];

@NgModule({
  declarations: [EmptyComponent],
  providers: [HtmlRouteRedirectGuard],
  imports: [RouterModule.forRoot(routes, {anchorScrolling: 'enabled', scrollOffset: [0, 50]})],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
