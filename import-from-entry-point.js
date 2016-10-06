'use strict';

function buildImportSpecifier(j, importSpecifier) {
  let local, imported;

  if (importSpecifier.type === 'ImportDefaultSpecifier') {
    if (importSpecifier.local.name === 'EmberObject') {
      local = importSpecifier.local;
      imported = j.identifier('Object');
    } else if (importSpecifier.local.name === 'EmberError') {
      local = importSpecifier.local;
      imported = j.identifier('Error');
    } else if (importSpecifier.local.name === 'Logger') {
      // do not change `Logger` from a default
      return importSpecifier;
    } else {
      local = imported = importSpecifier.local;
    }
  } else {
    local = importSpecifier.local;
    imported = importSpecifier.imported;
  }

  return j.importSpecifier(imported, local);
}

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
};

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const {expression, statement, statements} = j.template;
  let firstImportByPackage = {};

  let source = j(file.source)
    .find(j.ImportDeclaration)
    .replaceWith((p) => {
      let importSource = p.node.source.value;
      let { packageName } = getInfoFromImportSource(importSource);

      if (!packageName) {
    	return p.node;
      }

      let importForPackage = firstImportByPackage[packageName];
      if (!importForPackage) {
        firstImportByPackage[packageName] = p.node;
        p.node.source.value = packageName;

        p.node.specifiers.forEach((importSpecifier, index) => {
          if (importSpecifier.type === 'ImportDefaultSpecifier') {
            let updatedImportSpecifier = buildImportSpecifier(j, importSpecifier);

            p.node.specifiers.splice(index, 1);
			      p.node.specifiers.unshift(updatedImportSpecifier);
          }
        });

        return p.node;
      }

      p.node.specifiers.forEach((importSpecifier) => {
        let local, imported;
        let updatedImportSpecifier = buildImportSpecifier(j, importSpecifier);

        importForPackage.specifiers.push(updatedImportSpecifier);
      });
    })
    .toSource({
      quote: 'single'
    });

  return source.replace(/\bimport.+from/g, (importStatement) => {

    let openCurly = importStatement.indexOf('{');
    let closeCurly = importStatement.indexOf('}');

    // leave default only imports alone
    if (openCurly === -1) { return importStatement; }

    if (importStatement.length > 50) {
      // if the segment is > 50 chars make it multi-line
      let result = importStatement.slice(0, openCurly + 1);
      let named = importStatement
            .slice(openCurly + 1, -6).split(',')
            .map(name => `\n  ${name.trim()}`);

      return result + named.join(',') + '\n} from';
    } else {
      // if the segment is < 50 chars just make sure it has proper spacing
      return importStatement
        .replace(/\{\s*/, '{ ')
        .replace(/\s*\}/, ' }');
    }
  });
};
