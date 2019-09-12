import {NgModule} from '@angular/core';
import {PreloadAllModules, RouterModule, Routes} from '@angular/router';

// These are lazy-loaded routes - note that we dynamic-import the modules here
// to avoid having an eager dependency on them.

// IMPORTANT: this array is auto-updated by script/generator
// dont rename the 'routes' variable.
const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadChildren: () => import('./home/home.ngfactory').then(m => m.HomeModuleNgFactory)
  },
  {
    path: 'hello',
    pathMatch: 'full',
    loadChildren: () =>
        import('./hello-world/hello-world.module.ngfactory').then(m => m.HelloWorldModuleNgFactory)
  },
  {
    path: 'todos',
    pathMatch: 'full',
    loadChildren: () => import('./todos/todos.module.ngfactory').then(m => m.TodosModuleNgFactory)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    // TODO: maybe set this based on devmode?
    enableTracing: true,
    // preloadingStrategy: PreloadAllModules,
  })],
  exports: [RouterModule],
})
export class AppRoutingModule {
}
