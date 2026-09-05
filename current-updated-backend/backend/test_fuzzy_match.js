function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/^(?:mr\.|mr|mrs\.|mrs|ms\.|ms|shri|smt\.|dr\.|mi|m\.)\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function calculateNameMatch(extractedName, expectedName) {
  const normExtracted = normalize(extractedName);
  const normExpected = normalize(expectedName);

  if (!normExtracted || !normExpected) return false;
  if (normExtracted === normExpected) return true;

  // Token set matching
  const cleanExtracted = (extractedName || '').replace(/^(?:mr\.|mr|mrs\.|mrs|ms\.|ms|shri|smt\.|dr\.|mi|m\.)\s+/i, '').toLowerCase().trim();
  const cleanExpected = (expectedName || '').replace(/^(?:mr\.|mr|mrs\.|mrs|ms\.|ms|shri|smt\.|dr\.|mi|m\.)\s+/i, '').toLowerCase().trim();

  const tokensExtracted = cleanExtracted.split(/\s+/).filter(Boolean);
  const tokensExpected = cleanExpected.split(/\s+/).filter(Boolean);

  // Levenshtein similarity on joined normalized string
  const maxLen = Math.max(normExtracted.length, normExpected.length);
  const dist = levenshteinDistance(normExtracted, normExpected);
  const similarity = 1 - (dist / maxLen);

  if (similarity >= 0.75) return true;

  const setExpected = new Set(tokensExpected);
  const matchingTokens = tokensExtracted.filter(t => setExpected.has(t));
  return matchingTokens.length >= Math.min(tokensExpected.length, 2);
}

// Test assertions
console.log('1. Mr. Abhishek Rohidas Mavkar vs Abhishek Rohidas Mavkar:', calculateNameMatch('Mr. Abhishek Rohidas Mavkar', 'Abhishek Rohidas Mavkar'));
console.log('2. Mi Abhishek Fohidas Mavkar (OCR typo) vs Abhishek Rohidas Mavkar:', calculateNameMatch('Mi Abhishek Fohidas Mavkar', 'Abhishek Rohidas Mavkar'));
console.log('3. Ramesh Kumar vs Ramesh Kumar:', calculateNameMatch('Ramesh Kumar', 'Ramesh Kumar'));
console.log('4. Suresh Patil vs Ramesh Kumar (mismatch):', calculateNameMatch('Suresh Patil', 'Ramesh Kumar'));
