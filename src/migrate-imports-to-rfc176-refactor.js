'use strict';

/* globals Set */

const importsToMigrate = [
  'getCurrentRunLoop',
  'backburner',
  'run',
  'join',
  'bind',
  'begin',
  'end',
  'schedule',
  'hasScheduledTimers',
  'cancelTimers',
  'later',
  'once',
  'scheduleOnce',
  'next',
  'cancel',
  'debounce',
  'throttle',
  '_globalsRun',
];
const fromModule = 'ember-metal';
const toModule = '@ember/runloop';

module.exports = function(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  const printOptions = { quote: 'single', wrapColumn: 100 };

  function ensureImport(source, anchor, method) {
    method = method || 'insertAfter';

    let desiredImport = root.find(j.ImportDeclaration, {
      source: { value: source },
    });
    if (desiredImport.size() > 0) {
      return desiredImport;
    }

    let newImport = j.importDeclaration([], j.literal(source));
    let anchorImport = root.find(j.ImportDeclaration, {
      source: { value: anchor },
    });
    let imports = root.find(j.ImportDeclaration);
    if (anchorImport.size() > 0) {
      anchorImport.at(anchorImport.size() - 1)[method](newImport);
    } else if (imports.size() > 0) {
      // if anchor is not present, always add at the end
      imports.at(imports.size() - 1).insertAfter(newImport);
    } else {
      // if no imports are present, add as first statement
      root.get().node.program.body.unshift(newImport);
    }

    return j(newImport);
  }

  function ensureImportWithSpecifiers(options) {
    let source = options.source;
    let specifiers = options.specifiers;
    let anchor = options.anchor;
    let positionMethod = options.positionMethod;

    let importStatement = ensureImport(source, anchor, positionMethod);
    let combinedSpecifiers = new Set(specifiers);

    importStatement
      .find(j.ImportSpecifier)
      .forEach(i =>
        combinedSpecifiers.add(`${i.node.imported.name}|${i.node.local.name}`)
      )
      .remove();

    importStatement.get('specifiers').replace(
      Array.from(combinedSpecifiers)
        .sort()
        .map(s => {
          let parts = s.split('|');

          return j.importSpecifier(
            j.identifier(parts[0]),
            j.identifier(parts[1])
          );
        })
    );
  }

  function main() {
    let specifiers = new Set();

    // find any imports with our fromModule
    let imports = root.find(j.ImportDeclaration, {
      source: { value: fromModule },
    });
    if (imports.size() === 0) {
      return;
    }

    // track and remove specifiers listed in "importsToMigrate"
    imports
      .find(j.ImportSpecifier)
      .filter(p => importsToMigrate.indexOf(p.node.imported.name) !== -1)
      .forEach(p =>
        specifiers.add(`${p.node.imported.name}|${p.node.local.name}`)
      )
      .remove();

    // there was nothing to move, bail out...
    if (specifiers.size === 0) {
      return;
    }

    // ensure the new import is present and has the correct specifiers
    ensureImportWithSpecifiers({
      source: toModule,
      anchor: fromModule,
      positionMethod: 'insertBefore',
      specifiers,
    });

    // remove any of the "fromModule" imports that
    // now have no specifiers
    imports
      .filter(i => {
        if (i.get('specifiers').value.length === 0) {
          return true;
        }
      })
      .remove();
  }

  main();

  return root.toSource(printOptions);
};
