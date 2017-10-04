'use strict';

const utils = [
  'symbol',
  'setOwner',
  'getOwner',
  'OWNER',
  'assign',
  'EmptyObject',
  'dictionary',
  'uuid',
  'GUID_KEY',
  'GUID_DESC',
  'GUID_KEY_PROPERTY',
  'generateGuid',
  'guidFor',
  'intern',
  'checkHasSuper',
  'ROOT',
  'wrap',
  'inspect',
  'lookupDescriptor',
  'canInvoke',
  'tryInvoke',
  'makeArray',
  'applyStr',
  'toString',
];

function getInfoFromImportSource(input) {
  if (input[0] === '.') {
    return { relativePath: input };
  }

  let match = input.match(/([^\/]+)(?:\/(.+))?$/);
  if (!match) {
    throw new Error(`${input} does not match!`);
  }

  let packageName = match[1];
  let relativePath = match[2];

  return { packageName, relativePath };
}

function spliceSlice(str, index, count, add) {
  // We cannot pass negative indexes dirrectly to the 2nd slicing operation.
  if (index < 0) {
    index = str.length + index;
    if (index < 0) {
      index = 0;
    }
  }

  return str.slice(0, index) + (add || '') + str.slice(index + count);
}

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const { expression, statement, statements } = j.template;
  let utilsNeededMap = {};
  let utilsImport;

  let source = j(file.source)
    .find(j.ImportDeclaration)
    .replaceWith(p => {
      let importSource = p.node.source.value;
      let { packageName } = getInfoFromImportSource(importSource);

      let toRemove = [];
      p.node.specifiers.forEach((importSpecifier, index) => {
        let localName = importSpecifier.local.name;

        if (utils.indexOf(localName) > -1) {
          utilsNeededMap[localName] = true;
          toRemove.push(index);
        }
      });

      let reversedToRemove = toRemove.reverse();
      for (let i = 0; i < reversedToRemove.length; i++) {
        p.node.specifiers.splice(reversedToRemove[i], 1);
      }

      // remove the existing ember-utils import
      // remove the import if there are no specifiers left
      if (
        packageName === 'ember-utils' ||
        (p.node.specifiers.length === 0 && toRemove.length > 0)
      ) {
        return;
      }

      return p.node;
    })
    .toSource({
      quote: 'single',
    });

  // general import formatting
  source = source.replace(/\bimport.+from/g, importStatement => {
    let openCurly = importStatement.indexOf('{');
    let closeCurly = importStatement.indexOf('}');

    // leave default only imports alone
    if (openCurly === -1) {
      return importStatement;
    }

    if (importStatement.length > 50) {
      // if the segment is > 50 chars make it multi-line
      let result = importStatement.slice(0, openCurly + 1);
      let named = importStatement
        .slice(openCurly + 1, -6)
        .split(',')
        .map(name => `\n  ${name.trim()}`);

      return result + named.join(',') + '\n} from';
    } else {
      // if the segment is < 50 chars just make sure it has proper spacing
      return importStatement.replace(/\{\s*/, '{ ').replace(/\s*\}/, ' }');
    }
  });

  // add utils import
  let utilsNeeded = Object.keys(utilsNeededMap);
  if (utilsNeeded.length > 0) {
    let firstImportIndex = source.indexOf('import');
    let trailingWhitespace = '\n';

    if (firstImportIndex === -1) {
      firstImportIndex = 0;
      trailingWhitespace += '\n';
    }

    let importStatement = 'import {';

    let joinedImports = utilsNeeded.join(', ');
    if (joinedImports.length > 40) {
      importStatement += '\n  ' + utilsNeeded.join(',\n  ') + '\n';
    } else {
      importStatement += ' ' + utilsNeeded.join(', ') + ' ';
    }

    importStatement += `} from 'ember-utils';${trailingWhitespace}`;

    return (
      source.slice(0, firstImportIndex) +
      importStatement +
      source.slice(firstImportIndex)
    );
  } else {
    return source;
  }
};
