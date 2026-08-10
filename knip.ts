import type { KnipConfig } from 'knip'

/**
 * Knip config for the addon — finds unused files, exports and dependencies.
 *
 * Entry points (where the reachable-code graph starts):
 *   - setup/main.ts     Slidev auto-loads this to register the addon's components.
 *   - components/*.vue   The published component surface consumers import directly;
 *                        marked as entry so its public exports aren't flagged unused.
 * vite/vitest config files are auto-detected by knip's built-in plugins (which also
 * treat tests/**\/*.test.ts as entry), so they don't need listing here.
 */
const config: KnipConfig = {
  entry: ['setup/main.ts', 'components/*.vue'],
  project: [
    'components/**/*.{ts,vue}',
    'composables/**/*.ts',
    'engines/**/*.ts',
    'shared/**/*.{ts,vue}',
    'setup/**/*.ts',
  ],
  // @slidev/client and @slidev/types are supplied at runtime by the @slidev/cli
  // peer dependency, so they're imported but intentionally not direct deps.
  // @miragon/slidev-toolkit is the theme referenced in example.md's YAML
  // frontmatter, which knip can't parse (there is no Slidev markdown plugin).
  ignoreDependencies: ['@slidev/client', '@slidev/types', '@miragon/slidev-toolkit'],
}

export default config
