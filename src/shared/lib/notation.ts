interface Notation {
  readonly kind: string
}

export interface StaticNotation extends Notation {
  readonly rendering: 'static'
  exportSvg(source: string, container: HTMLElement): Promise<string>
}

export interface LiveViewer {
  show(source: string): Promise<void>
  fit?(): void
  destroy(): void
}

export interface LiveNotation extends Notation {
  readonly rendering: 'live'
  createViewer(container: HTMLElement): Promise<LiveViewer>
}

export type PreviewNotation = StaticNotation | LiveNotation

export interface ModelerContainers {
  canvas: HTMLElement
  // Present exactly when the notation declares `hasPropertiesPanel`.
  propertiesPanel?: HTMLElement
}

export interface ModelerSession {
  // The edited source, or null when the user changed nothing.
  exportChanges(): Promise<string | null>
  resized?(): void
  destroy(): void
}

export interface ModelerNotation extends Notation {
  readonly blankSource: string
  readonly hasPropertiesPanel?: boolean
  openModeler(source: string, containers: ModelerContainers): Promise<ModelerSession>
}
