'use strict';

module.exports = function transformer(file, api) {
  let j = api.jscodeshift;

  return j(file.source)
    .find(j.VariableDeclaration)
    .forEach(path => {
      let node = path.node;

      if (
        (node.declarations[0].init &&
          node.declarations[0].init.type === 'MemberExpression' &&
          node.declarations[0].init.object.callee &&
          node.declarations[0].init.object.callee.name === 'require') ||
        (node.declarations[0].init &&
          node.declarations[0].init.type === 'CallExpression' &&
          node.declarations[0].init.callee &&
          node.declarations[0].init.callee.name === 'require')
      ) {
        path.node.kind = 'const';
      }
    })
    .toSource();
};
