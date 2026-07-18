/**
 * Architecture guardrail for the addon's source layers.
 *
 * Layering (imports only ever point "down"):
 *   components/  -> composables/, engines/, shared/   (the public component surface)
 *   composables/ -> shared/
 *   engines/     -> engines/ (self, via types)
 *   shared/      -> (leaf; imports nothing from the layers above)
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
      name: 'engines-not-to-ui',
      comment: 'Engine adapters must not know about the UI (components/composables).',
      severity: 'error',
      from: { path: '^engines/' },
      to: { path: '^(components|composables)/' },
    },
    {
      name: 'composables-not-to-components',
      comment: 'Composables are lower-level than components and must not import them.',
      severity: 'error',
      from: { path: '^composables/' },
      to: { path: '^components/' },
    },
    {
      name: 'shared-is-a-leaf',
      comment: 'shared/ holds reusable UI atoms + helpers; it must not import upward.',
      severity: 'error',
      from: { path: '^shared/' },
      to: { path: '^(components|composables|engines)/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    includeOnly: '^(components|composables|engines|shared)/',
    enhancedResolveOptions: {
      extensions: ['.ts', '.js', '.vue'],
    },
  },
}
