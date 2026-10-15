const terminalStatuses = new Set(['completed', 'cancelled', 'refunded']);

const allowedTransitions: Record<string, Set<string>> = {
  submitted: new Set(['awaiting_payment', 'confirmed', 'site_survey_scheduled', 'cancelled']),
  awaiting_payment: new Set(['submitted', 'confirmed', 'paid', 'cancelled']),
  paid: new Set(['confirmed', 'site_survey_scheduled', 'cancelled']),
  confirmed: new Set(['site_survey_scheduled', 'assigned', 'in_progress', 'cancelled']),
  site_survey_scheduled: new Set(['assigned', 'in_progress', 'cancelled']),
  assigned: new Set(['installation_in_progress', 'in_progress', 'cancelled']),
  in_progress: new Set(['installation_in_progress', 'completed']),
  installation_in_progress: new Set(['completed']),
  completed: new Set(),
  cancelled: new Set(),
  refunded: new Set(),
};

export function canTransitionOrderStatus(current: string, next: string): boolean {
  if (current === next) return true;
  if (terminalStatuses.has(current)) return false;
  return allowedTransitions[current]?.has(next) ?? false;
}

