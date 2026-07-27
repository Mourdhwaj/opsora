import analytics from '@react-native-firebase/analytics';

export function logScreenView(screenName: string, screenClass?: string) {
  analytics().logScreenView({
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
}

export function logLogin(method: string = 'email') {
  analytics().logLogin({ method });
}

export function logSignUp(method: string = 'email') {
  analytics().logSignUp({ method });
}

export function logPropertyView(propertyId: string) {
  analytics().logEvent('property_view', { property_id: propertyId });
}

export function logPaymentCreated(amount: number, monthYear: string) {
  analytics().logEvent('payment_created', { amount, month_year: monthYear });
}

export function logComplaintSubmitted(category: string, priority: string) {
  analytics().logEvent('complaint_submitted', { category, priority });
}

export function logFoodPollVote(pollId: string, optionId: string) {
  analytics().logEvent('food_poll_vote', { poll_id: pollId, option_id: optionId });
}
