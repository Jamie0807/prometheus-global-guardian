const DEFAULT_X_AXIS_LABEL_COUNT = 8;

export function getXAxisLabelIndexes(
  totalPoints: number,
  maxLabels = DEFAULT_X_AXIS_LABEL_COUNT,
): number[] {
  const pointCount = Math.max(0, Math.trunc(totalPoints));
  const labelCount = Math.max(1, Math.trunc(maxLabels));

  if (pointCount <= labelCount) {
    return Array.from({ length: pointCount }, (_, index) => index);
  }

  if (labelCount === 1) {
    return [0];
  }

  return Array.from({ length: labelCount }, (_, index) =>
    Math.round((index * (pointCount - 1)) / (labelCount - 1)),
  );
}
