export const getPeriodDates = (period, customPeriod) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'weekly':
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;
    case 'custom':
      startDate = new Date(customPeriod?.startDate);
      endDate = new Date(customPeriod?.endDate);
      break;
    case 'monthly':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  return { startDate, endDate };
};