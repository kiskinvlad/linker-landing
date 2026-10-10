import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FEEDBACK_API, FeedbackItem, FeedbackRequest } from '../api/feedback.api';
import { Ga4Loader } from '../consent/ga4.loader';

/**
 * The Feedback Program's submitter side (plan §10a): send an idea, list your
 * ideas. Reviewing and shipping have no route; they are backend CLI commands.
 */
@Injectable({ providedIn: 'root' })
export class FeedbackFacade {
  private readonly api = inject(FEEDBACK_API);
  private readonly ga = inject(Ga4Loader);

  async submit(body: FeedbackRequest): Promise<FeedbackItem> {
    const item = await firstValueFrom(this.api.submit(body));
    this.ga.event('feedback_submit', { kind: item.kind });
    return item;
  }

  mine(): Promise<FeedbackItem[]> {
    return firstValueFrom(this.api.mine());
  }
}
