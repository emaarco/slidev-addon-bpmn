import { ref } from 'vue'
import { resolveWithinBase } from './utils/resolveWithinBase'

export class DiagramFileLoader {
  readonly loading = ref(true)
  readonly error = ref<string | null>(null)
  private readonly files = new Map<string, Promise<string>>()

  constructor(private readonly diagramKind: string) {}

  // Fetches each path once; a failed fetch is forgotten so the next call retries.
  fetchFile(path: string): Promise<string> {
    if (!this.files.has(path)) {
      this.files.set(path, this.download(path).catch((err) => {
        this.files.delete(path)
        throw err
      }))
    }
    return this.files.get(path)!
  }

  async withLoading<T>(load: () => Promise<T>): Promise<T | undefined> {
    this.loading.value = true
    this.error.value = null
    try {
      return await load()
    } catch (err) {
      this.error.value = `Failed to load ${this.diagramKind}: ${err instanceof Error ? err.message : String(err)}`
      console.error(`${this.diagramKind} loading error:`, err)
      return undefined
    } finally {
      this.loading.value = false
    }
  }

  private async download(path: string): Promise<string> {
    const response = await fetch(resolveWithinBase(path))
    if (!response.ok) {
      throw new Error(`Failed to fetch ${this.diagramKind} file: ${response.status}`)
    }
    return response.text()
  }
}
