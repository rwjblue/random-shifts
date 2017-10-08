const path = require('path');
const execa = require('execa');
const { createTempDir } = require('broccoli-test-helper');

function setupTransformTest(transformName, hooks) {
  hooks.beforeEach(async function() {
    this.tmpdir = await createTempDir();
    this.transformPath = path.join(__dirname, '../opt', transformName);
  });

  hooks.afterEach(async function() {
    await this.tmpdir.dispose();
  });
}

function transformTest(input, expectedOutput, description) {
  QUnit.test(description, async function(assert) {
    this.tmpdir.write(input);

    await execa('jscodeshift', ['-t', this.transformPath, this.tmpdir.path()], {
      preferLocal: true,
    });

    assert.deepEqual(this.tmpdir.read(), expectedOutput);
  });
}

module.exports.setupTransformTest = setupTransformTest;
module.exports.transformTest = transformTest;
