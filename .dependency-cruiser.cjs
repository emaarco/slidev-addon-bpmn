/**
 * Architecture guardrail for the addon's source modules.
 *
 * Layering (imports only ever point "down"):
 *   components/<modeler>/ -> plugins/<modeler>/, shared/   (the public component surface)
 *   plugins/<modeler>/    -> shared/
 *   shared/               -> (leaf; imports nothing from the layers above)
 *
 * A modeler (bpmn, dmn, ...) never imports another modeler; they only meet in shared/.
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
      comment: 'A modeler must not import another modeler; code they both need lives in shared/.',
      severity: 'error',
      from: { path: '^(components|plugins)/([^/]+)/' },
      to: { path: '^(components|plugins)/[^/]+/', pathNot: '^(components|plugins)/$2/' },
    },
    {
      name: 'plugins-not-to-components',
      comment: 'Plugins hold engine wiring and must not know about the UI.',
      severity: 'error',
      from: { path: '^plugins/' },
      to: { path: '^components/' },
    },
    {
      name: 'shared-is-a-leaf',
      comment: 'shared/ holds reusable UI atoms + helpers; it must not import upward.',
      severity: 'error',
      from: { path: '^shared/' },
      to: { path: '^(components|plugins)/' },
    },
    {
      name: 'utils-are-leaves',
      comment: 'utils/ holds stateless helpers; they may only import other utils.',
      severity: 'error',
      from: { path: '/utils/' },
      to: { path: '^(components|plugins|shared)/', pathNot: '/utils/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^(components|plugins|shared)/',
    enhancedResolveOptions: {
      extensions: ['.ts', '.js', '.vue'],
    },
  },
}
