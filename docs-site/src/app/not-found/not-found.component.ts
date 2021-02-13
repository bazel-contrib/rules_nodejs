import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent implements OnInit {
  target: string;

  ngOnInit(): void {
    const segments = window.location.pathname.split('/');
    const last = segments.pop();
    this.target = `/${segments.join('/')}:${last}`;
  }
}
