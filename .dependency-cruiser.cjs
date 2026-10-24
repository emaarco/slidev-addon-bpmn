/**
 * Architecture guardrail for the addon's source modules.
 *
 * Layering (imports only ever point "down"):
 *   components/<modeler>/ -> src/<modeler>/, src/shared/   (the public component surface)
 *   src/<modeler>/        -> src/shared/
 *   src/shared/           -> (leaf; imports nothing from the layers above)
 *
 * A modeler (bpmn, dmn, ...) never imports another modeler; they only meet in src/shared/.
 * utils/ folders hold stateless helpers and are leaves of their layer.
 *
 * See components/README.md for why components/ is the public surface.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Circular dependencies make the module graph hard to reason about.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'modelers-are-isolated',
      comment: 'A modeler must not import another modeler; code they both need lives in src/shared/.',
      severity: 'error',
      from: { path: '^(?:components|src)/([^/]+)/' },
      to: {
        path: '^(?:components|src)/[^/]+/',
        pathNot: ['^(?:components|src)/$1/', '^src/shared/'],
      },
    },
    {
      name: 'src-not-to-components',
      comment: 'src/ holds the modeler logic and must not know about the public components.',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^components/' },
    },
    {
      name: 'shared-is-a-leaf',
      comment: 'src/shared/ holds infrastructure every modeler uses; it must not import a modeler.',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^(components|src/(?!shared/))' },
    },
    {
      name: 'utils-are-leaves',
      comment: 'utils/ holds stateless helpers; they may only import other utils.',
      severity: 'error',
      from: { path: '/utils/' },
      to: { path: '^(components|src)/', pathNot: '/utils/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^(components|src)/',
    enhancedResolveOptions: {
      extensions: ['.ts', '.js', '.vue'],
    },
  },
}
