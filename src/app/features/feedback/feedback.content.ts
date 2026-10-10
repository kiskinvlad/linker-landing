import { FeedbackArea, FeedbackItem, FeedbackKind } from '../../core/api/feedback.api';

/** /feedback copy (plan §10a): labels for the form and "Your ideas". */

export const KIND_LABELS: Record<FeedbackKind, string> = {
  feature: $localize`:@@feedback.kind.feature:New feature`,
  improvement: $localize`:@@feedback.kind.improvement:Improvement`,
  bug: $localize`:@@feedback.kind.bug:Bug`,
};

export const AREA_LABELS: Record<FeedbackArea, string> = {
  editor: $localize`:@@feedback.area.editor:Editor`,
  widgets: $localize`:@@feedback.area.widgets:Widgets`,
  publishing: $localize`:@@feedback.area.publishing:Publishing`,
  forms: $localize`:@@feedback.area.forms:Forms`,
  analytics: $localize`:@@feedback.area.analytics:Analytics`,
  billing: $localize`:@@feedback.area.billing:Plans and billing`,
  account: $localize`:@@feedback.area.account:Account`,
  other: $localize`:@@feedback.area.other:Something else`,
};

/** A status as the submitter reads it. Wording follows /legal/feedback-program §4–5. */
export interface StatusView {
  label: string;
  /** Green once we've committed to it (approved, shipped); neutral otherwise. */
  tone: 'ok' | 'neutral';
}

export function statusView(item: FeedbackItem): StatusView {
  switch (item.status) {
    case 'submitted':
      return { label: $localize`:@@feedback.status.submitted:Submitted`, tone: 'neutral' };
    case 'under_review':
      return { label: $localize`:@@feedback.status.underReview:Under review`, tone: 'neutral' };
    case 'approved':
      return {
        label: $localize`:@@feedback.status.approved:Approved · we’ll build it`,
        tone: 'ok',
      };
    case 'shipped':
      return {
        label:
          item.reward === 'unlock'
            ? $localize`:@@feedback.status.shippedUnlock:Shipped · free for you`
            : $localize`:@@feedback.status.shippedThanks:Shipped · thank you`,
        tone: 'ok',
      };
    case 'declined':
      return { label: $localize`:@@feedback.status.declined:Declined`, tone: 'neutral' };
    case 'duplicate':
      // Sent after the original was approved: no reward (program §5). Before it: the
      // item shares the original's outcome, so it reads as merged, not as closed.
      return item.alreadyPlanned
        ? { label: $localize`:@@feedback.status.alreadyPlanned:Already planned`, tone: 'neutral' }
        : {
            label: $localize`:@@feedback.status.merged:Merged with an earlier idea`,
            tone: 'neutral',
          };
  }
}
