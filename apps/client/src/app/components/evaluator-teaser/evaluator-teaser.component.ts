import {
  ChangeDetectionStrategy,
  Component,
  OnInit
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

const DISMISSED_KEY = 'gf_evaluator_teaser_dismissed';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  selector: 'gf-evaluator-teaser',
  styleUrls: ['./evaluator-teaser.component.scss'],
  templateUrl: './evaluator-teaser.component.html'
})
export class GfEvaluatorTeaserComponent implements OnInit {
  public isVisible = false;

  public constructor(private router: Router) {}

  public ngOnInit() {
    if (!sessionStorage.getItem(DISMISSED_KEY)) {
      this.isVisible = true;
    }
  }

  public onOpenDemo() {
    this.dismiss();
    this.router.navigate(['/demo']);
  }

  public onDismiss() {
    this.dismiss();
  }

  private dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    this.isVisible = false;
  }
}
