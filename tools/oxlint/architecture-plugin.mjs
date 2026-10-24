const MESSAGE = 'Top-level functions belong in a class, or in a utils/ module when they are pure helpers.'

function isFunction(node) {
  return node?.type === 'ArrowFunctionExpression' || node?.type === 'FunctionExpression'
}

function topLevelFunctions(statement) {
  const declaration =
    statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'
      ? statement.declaration
      : statement
  if (!declaration) return []
  if (declaration.type === 'FunctionDeclaration' || isFunction(declaration)) return [declaration]
  if (declaration.type === 'VariableDeclaration') {
    return declaration.declarations.filter(declarator => isFunction(declarator.init))
  }
  return []
}

export default {
  meta: { name: 'architecture' },
  rules: {
    'no-top-level-functions': {
      meta: { type: 'suggestion', docs: { description: MESSAGE } },
      create(context) {
        return {
          Program(program) {
            for (const statement of program.body) {
              for (const node of topLevelFunctions(statement)) context.report({ node, message: MESSAGE })
            }
          },
        }
      },
    },
  },
}
