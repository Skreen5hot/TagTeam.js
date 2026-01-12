// Simulate the trust scoring logic
const text = "I discovered that my company is falsifying safety reports";

const keywords = {
    complete: [
        'complete trust', 'always trusted', 'trusted completely',
        'reliable', 'dependable', 'faithful'
    ],
    high: [
        'trust', 'trusted', 'trustworthy', 'confidence',
        'doctor', 'medical', 'family'
    ],
    moderate: [
        'friend', 'best friend'
    ],
    low: [
        'distrust', 'suspicious', 'doubtful', 'unreliable',
        'questioning'
    ],
    none: [
        'betrayal', 'betrayed', 'no trust', 'cannot trust',
        'deceitful', 'dishonest', 'cheating', 'falsifying',
        'falsifying safety reports'
    ]
};

const scores = {
    complete: 1.0,
    high: 0.8,
    moderate: 0.7,
    low: 0.3,
    none: 0.2
};

const DEFAULT_TRUST = 0.5;

console.log('Text:', text);
console.log('\n=== Checking all keyword categories ===\n');

let maxScore = DEFAULT_TRUST;
const matches = [];

for (const setName in keywords) {
    const keywordList = keywords[setName];
    const baseScore = scores[setName];

    console.log(`Category: ${setName} (score: ${baseScore})`);

    for (const keyword of keywordList) {
        const regex = new RegExp('\\b' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        const found = regex.test(text.toLowerCase());

        if (found) {
            console.log(`  ✅ MATCH: "${keyword}"`);
            matches.push({ keyword, category: setName, score: baseScore });
            maxScore = Math.max(maxScore, baseScore);
        }
    }
}

console.log('\n=== Summary ===');
console.log('All matches:', matches);
console.log('Max score:', maxScore);
console.log('Expected:', 0.2);
console.log('Match:', maxScore === 0.2 ? 'YES ✅' : 'NO ❌');
