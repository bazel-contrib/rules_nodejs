import {ChangeDetectionStrategy, Component, ViewEncapsulation,} from '@angular/core';

@Component({
  selector: 'button[bazelButton]',
  templateUrl: 'button.html',
  styleUrls: ['button.scss'],
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bazel-button',
  },
})
export class BazelButton {}
