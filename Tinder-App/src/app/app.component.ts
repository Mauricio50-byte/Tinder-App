import { Component, OnInit } from '@angular/core';
import { PushService } from './core/providers/push';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(private push: PushService) {}

  async ngOnInit(): Promise<void> {
    await this.push.init();
  }
}
