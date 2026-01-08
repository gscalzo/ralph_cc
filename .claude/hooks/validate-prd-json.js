#!/usr/bin/env node
// Validates prd.json structure after any write to it

const fs = require('fs');
const path = require('path');

// Get the file path from environment variable set by Claude Code hooks
const filePath = process.env.CLAUDE_TOOL_FILE_PATH || process.argv[2];

// Only run if writing to prd.json
if (!filePath || !filePath.endsWith('prd.json')) {
  process.exit(0);
}

try {
  const content = fs.readFileSync(filePath, 'utf8');
  const prd = JSON.parse(content);

  // Validate required top-level fields
  if (!prd.project) {
    console.error('ERROR: prd.json missing required field: project');
    process.exit(1);
  }

  if (!prd.branchName) {
    console.error('ERROR: prd.json missing required field: branchName');
    process.exit(1);
  }

  if (!prd.userStories) {
    console.error('ERROR: prd.json missing required field: userStories');
    process.exit(1);
  }

  if (!Array.isArray(prd.userStories)) {
    console.error('ERROR: prd.json userStories must be an array');
    process.exit(1);
  }

  // Validate each story
  prd.userStories.forEach((story, idx) => {
    const storyNum = idx + 1;

    if (!story.id) {
      console.error(`ERROR: Story ${storyNum} missing required field: id`);
      process.exit(1);
    }

    if (!story.title) {
      console.error(`ERROR: Story ${storyNum} (${story.id}) missing required field: title`);
      process.exit(1);
    }

    if (!story.description) {
      console.error(`ERROR: Story ${storyNum} (${story.id}) missing required field: description`);
      process.exit(1);
    }

    if (!story.acceptanceCriteria) {
      console.error(`ERROR: Story ${storyNum} (${story.id}) missing required field: acceptanceCriteria`);
      process.exit(1);
    }

    if (!Array.isArray(story.acceptanceCriteria)) {
      console.error(`ERROR: Story ${storyNum} (${story.id}) acceptanceCriteria must be an array`);
      process.exit(1);
    }

    if (story.acceptanceCriteria.length === 0) {
      console.error(`ERROR: Story ${storyNum} (${story.id}) must have at least one acceptance criterion`);
      process.exit(1);
    }

    if (typeof story.passes !== 'boolean') {
      console.error(`ERROR: Story ${storyNum} (${story.id}) passes must be a boolean (true/false)`);
      process.exit(1);
    }

    if (typeof story.priority !== 'number') {
      console.error(`ERROR: Story ${storyNum} (${story.id}) priority must be a number`);
      process.exit(1);
    }

    if ('notes' in story && typeof story.notes !== 'string') {
      console.error(`ERROR: Story ${storyNum} (${story.id}) notes must be a string`);
      process.exit(1);
    }
  });

  console.log('✓ prd.json validation passed');
  process.exit(0);
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error('ERROR: File not found:', filePath);
  } else if (err instanceof SyntaxError) {
    console.error('ERROR: Invalid JSON format in prd.json');
    console.error('  ', err.message);
  } else {
    console.error('ERROR: Validation failed:', err.message);
  }
  process.exit(1);
}
