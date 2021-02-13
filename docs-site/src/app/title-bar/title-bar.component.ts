import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

@Component({
  selector: 'app-title-bar',
  templateUrl: './title-bar.component.html',
  styleUrls: ['./title-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TitleBarComponent implements OnInit {
  isNavbarCollapsed = true;

  constructor() {}

  ngOnInit(): void {}
}
