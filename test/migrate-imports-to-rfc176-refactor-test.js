const { setupTransformTest, transformTest } = require('./helpers');

QUnit.module('migrate-imports-to-rfc176-refactor', function(hooks) {
  setupTransformTest('migrate-imports-to-rfc176-refactor.js', hooks);

  transformTest(
    {
      'one.js': `import { foo } from 'bar';`,
      'two.js': `import { run } from 'ember-metal';`,
      'three.js': `import { schedule as runSchedule } from 'ember-metal';`,
      'four.js': `import { run, get, set } from 'ember-metal';`,
      'five.js': `import { run } from 'ember-metal';\nimport { schedule } from 'ember-metal';`,
    },
    {
      'one.js': `import { foo } from 'bar';`,
      'two.js': `import { run } from '@ember/runloop';`,
      'three.js': `import { schedule as runSchedule } from '@ember/runloop';`,
      'four.js': `import { run } from '@ember/runloop';\nimport { get, set } from 'ember-metal';`,
      'five.js': `import { run, schedule } from '@ember/runloop';`,
    }
  );
});
