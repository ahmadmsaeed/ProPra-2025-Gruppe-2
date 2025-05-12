import { Component } from '@angular/core';

@Component({
  selector: 'app-info-box',
  templateUrl: './info-box.component.html',
  styleUrls: ['./info-box.component.scss'],
  standalone: true,
})
export class InfoBoxComponent {
  text = "Additional Info-Text on our Info Box! 🎊";
  hidden = true;
}
