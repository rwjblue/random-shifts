'use strict';

const path = require('path');

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

module.exports = function transformer(file, api) {
  let j = api.jscodeshift;

  let [, currentPackage, baseDir] = file.path.match(
    /^packages\/([^\/]+)\/([^\/]+)/
  );

  return j(file.source)
    .find(j.ImportDeclaration)
    .replaceWith(p => {
      let importSource = p.node.source.value;
      let sourceInfo = getInfoFromImportSource(importSource);

      if (sourceInfo.packageName !== currentPackage) {
        return p.node;
      }

      if (!sourceInfo.relativePath) {
        sourceInfo.relativePath = 'index';
      }

      let includeBaseDir = baseDir === 'lib';
      let from = file.path;
      let to = `packages/${currentPackage}/${includeBaseDir
        ? baseDir
        : ''}/${sourceInfo.relativePath}`;

      let relativePath = path
        .relative(from, to)
        .replace(/^../, '.')
        .replace('lib/', '');
      relativePath = path.normalize(relativePath);

      if (relativePath[0] !== '.') {
        relativePath = './' + relativePath;
      }

      p.node.source.value = relativePath;

      return p.node;
    })
    .toSource({ quote: 'single' });
};
