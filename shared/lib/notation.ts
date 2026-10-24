interface Notation {
  readonly kind: string
}

export interface StaticNotation extends Notation {
  exportSvg(source: string, container: HTMLElement): Promise<string>
}

export interface LiveViewer {
  show(source: string): Promise<void>
  fit?(): void
  destroy(): void
}

export interface LiveNotation extends Notation {
  createViewer(container: HTMLElement): Promise<LiveViewer>
}

export interface ModelerContainers {
  canvas: HTMLElement
  propertiesPanel?: HTMLElement
}

export interface ModelerSession {
  exportSource(): string | Promise<string>
  resized?(): void
  destroy(): void
}

export interface ModelerNotation extends Notation {
  readonly blankSource: string
  readonly hasPropertiesPanel?: boolean
  openModeler(source: string, containers: ModelerContainers): Promise<ModelerSession>
}

export type PreviewNotation = StaticNotation | LiveNotation
