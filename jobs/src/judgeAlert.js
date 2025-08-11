// Minimal rule engine: given wbgt level => issue alert when >= '警戒'
export function judgeAlert({ level, hour }) {
  // Quiet hours 22-07: skip issuing
  if (hour >= 22 || hour < 7) return { shouldIssue: false, reason: 'quiet_hours' };
  const levels = ['注意', '警戒', '厳重警戒', '危険'];
  const idx = levels.indexOf(level);
  if (idx === -1) return { shouldIssue: false, reason: 'unknown_level' };
  return { shouldIssue: idx >= 1, reason: idx >= 1 ? 'alert' : 'below_threshold' };
}
