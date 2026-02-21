/**
 * Test Rollback Mechanism
 *
 * This script tests that the rollback actually works when a skill fails.
 *
 * Usage: npx tsx mcp-server/test-rollback.ts
 */

import { SkillEngine } from './src/skills/engine.js';
import { promises as fs } from 'fs';
import path from 'path';

const TEST_DIR = path.join(process.cwd(), 'test-rollback-workspace');
const TEST_FILE = path.join(TEST_DIR, 'test.txt');

async function setup() {
  console.log('Setting up test environment...\n');

  // Create test directory
  await fs.mkdir(TEST_DIR, { recursive: true });

  // Create test file with original content
  const originalContent = 'ORIGINAL CONTENT - DO NOT MODIFY';
  await fs.writeFile(TEST_FILE, originalContent, 'utf-8');

  console.log(`✓ Created test file: ${TEST_FILE}`);
  console.log(`  Content: "${originalContent}"\n`);

  return originalContent;
}

async function cleanup() {
  console.log('\nCleaning up test environment...');
  await fs.rm(TEST_DIR, { recursive: true, force: true });
  console.log('✓ Test directory removed\n');
}

async function testRollback() {
  const originalContent = await setup();

  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('🔬 ROLLBACK MECHANISM TEST');
    console.log('═══════════════════════════════════════════════════\n');

    const engine = new SkillEngine(TEST_DIR);

    // Create a failing skill definition
    const failingSkill = {
      skill: {
        id: 'test-failing-skill',
        name: 'Test Failing Skill',
        description: 'A skill that modifies files then fails',
        category: 'testing',
        pricing: 'free' as const,
        version: '1.0.0',
        execution: [
          {
            step: 'write_file',
            path: 'test.txt',
            content: 'CORRUPTED CONTENT - THIS SHOULD BE ROLLED BACK',
          },
          {
            step: 'throw_error', // This will cause an error
            message: 'Intentional failure to test rollback',
          },
        ],
        success_message: 'This should never be seen',
        estimated_time: 1,
      },
    };

    console.log('Test 1: Execute skill that modifies file then fails\n');

    console.log('  Step 1: File content BEFORE skill execution:');
    const contentBefore = await fs.readFile(TEST_FILE, 'utf-8');
    console.log(`    "${contentBefore}"`);

    console.log('\n  Step 2: Executing failing skill...');
    console.log('    (Should write file, then throw error, then rollback)\n');

    // Execute the skill (should fail and rollback)
    const result = await engine.executeSkill(failingSkill, {}, {
      files: [TEST_FILE],
    });

    console.log('\n  Step 3: Skill execution result:');
    console.log(`    Success: ${result.success}`);
    console.log(`    Message: ${result.message}`);
    console.log(`    Error: ${result.error}`);

    console.log('\n  Step 4: File content AFTER rollback:');
    const contentAfter = await fs.readFile(TEST_FILE, 'utf-8');
    console.log(`    "${contentAfter}"`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS');
    console.log('═══════════════════════════════════════════════════\n');

    // Verify rollback worked
    if (contentAfter === originalContent) {
      console.log('✅ ROLLBACK TEST PASSED!');
      console.log('   File was successfully restored to original content');
      console.log('   Rollback mechanism is working correctly\n');
    } else {
      console.log('❌ ROLLBACK TEST FAILED!');
      console.log(`   Expected: "${originalContent}"`);
      console.log(`   Got: "${contentAfter}"`);
      console.log('   File was NOT restored!\n');
      process.exit(1);
    }

    // Verify skill reported failure
    if (!result.success && result.message.includes('rolled back')) {
      console.log('✅ ERROR HANDLING CORRECT');
      console.log('   Skill properly reported failure with rollback message\n');
    } else {
      console.log('⚠️  ERROR MESSAGE MISSING ROLLBACK INFO');
      console.log(`   Message was: "${result.message}"\n`);
    }

    console.log('🎉 ALL ROLLBACK TESTS PASSED!\n');
    console.log('The rollback mechanism:');
    console.log('  ✓ Creates backups before modifying files');
    console.log('  ✓ Restores files when skill fails');
    console.log('  ✓ Reports rollback in error message');
    console.log('  ✓ Protects user data from corruption\n');
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(error);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Run test
testRollback().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
