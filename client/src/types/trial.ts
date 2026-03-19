export interface GuideStep {
  step_number: number;
  step_key: string;
  title: string;
  description: string;
  action_url: string;
  unlocked: boolean;
  completed: boolean;
  completed_at: string | null;
}

export interface TrialGuideData {
  is_trial: boolean;
  days_remaining: number;
  trial_store_code: string;
  guide_completed: boolean;
  steps: GuideStep[];
  current_step: GuideStep | null;
}

export interface CompleteStepResponse {
  completed_step: {
    step_number: number;
    step_key: string;
    completed_at: string;
  };
  next_step: GuideStep | null;
  all_completed: boolean;
  celebration: boolean;
}
