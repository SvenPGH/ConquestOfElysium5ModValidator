/**
 * Edit distance, used only to turn a typo into "did you mean".
 */

/**
 * Levenshtein distance, abandoned as soon as it passes `cap`.
 *
 * The cap is what makes this usable: an unknown command is compared against all
 * 853 known ones, and almost all of them bail on the length check or on the
 * first row.
 */
export function distance(a, b, cap = 3) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;

  let previous = [...Array(b.length + 1).keys()];

  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;

    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, substitution);
      best = Math.min(best, row[j]);
    }

    // Nothing in this row is within the cap, so no later row can be either.
    if (best > cap) return cap + 1;
    previous = row;
  }

  return previous[b.length];
}

/**
 * Closest candidate within an edit distance of `cap`, or null.
 * The threshold tightens as better matches turn up, so the search accelerates.
 */
export function closestMatch(word, candidates, cap = 3) {
  let best = null;
  let bestDistance = cap;

  for (const candidate of candidates) {
    const d = distance(word, candidate, bestDistance);
    if (d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }

  return best;
}
