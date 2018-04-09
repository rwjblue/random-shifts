'use strict';

const path = require('path');

function addLibToPath(source) {
  let parts = source.split(/\.\.\/?/);
  let relativePath = parts.pop();

  let result = `${parts.join('../')}../lib/${relativePath}`;
  return result;
}

module.exports = function transformer(file, api) {
  let j = api.jscodeshift;

  let [, currentPackage, baseDir] = file.path.match(
    /^packages\/([^\/]+)\/([^\/]+)/
  );

  if (!baseDir.startsWith('tests')) {
    return file.source;
  }

  return j(file.source)
    .find(j.ImportDeclaration)
    .replaceWith(p => {
      let importSource = p.node.source.value;

      // do nothing for things imported from _other_ packages
      if (!importSource.startsWith('../')) {
        return p.node;
      }

      let expandedSource = path.normalize(
        path.join(path.dirname(file.path), importSource)
      );

      if (
        !expandedSource.includes(currentPackage + '/tests') &&
        !expandedSource.includes(`${currentPackage}/index`) &&
        !expandedSource.includes(`${currentPackage}/lib`) &&
        !expandedSource.endsWith(currentPackage)
      ) {
        p.node.source.value = addLibToPath(importSource);
      }

      return p.node;
    })
    .toSource({ quote: 'single' });
};
