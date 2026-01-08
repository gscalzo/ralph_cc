#!/usr/bin/env node
// Validates commit message format after git commit

const { execSync } = require('child_process');

try {
  // Get last commit message
  const lastCommit = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();

  // Check format: "feat: [Story ID] - [Story Title]"
  const regex = /^feat: \[US-\d+\] - .+$/;

  if (!regex.test(lastCommit)) {
    console.warn('⚠️  Commit message does not follow Ralph format');
    console.warn('   Expected: "feat: [US-XXX] - Title"');
    console.warn(`   Got: ${lastCommit.split('\n')[0]}`);
    console.warn('   (This is just a warning, not blocking)');
  } else {
    console.log('✓ Commit message format valid');
  }

  process.exit(0);
} catch (err) {
  // No git repo or no commits yet - silently pass
  process.exit(0);
}
