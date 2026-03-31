import { ref } from 'vue'

export function useBpmn() {
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function fetchBpmnXml(path: string): Promise<string> {
    const url = new URL(path, window.location.origin + import.meta.env.BASE_URL).href
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch BPMN file: ${response.status}`)
    }
    return response.text()
  }

  async function withLoading<T>(fn: () => Promise<T>): Promise<T | undefined> {
    loading.value = true
    error.value = null
    try {
      return await fn()
    } catch (err) {
      error.value = `Failed to load BPMN: ${err instanceof Error ? err.message : String(err)}`
      console.error('BPMN loading error:', err)
      return undefined
    } finally {
      loading.value = false
    }
  }

  return { loading, error, fetchBpmnXml, withLoading }
}
