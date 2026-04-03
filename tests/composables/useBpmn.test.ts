import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useBpmn } from '../../composables/useBpmn'

describe('useBpmn', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('starts with loading true and error null', () => {
      const { loading, error } = useBpmn()
      expect(loading.value).toBe(true)
      expect(error.value).toBeNull()
    })
  })

  describe('fetchBpmnXml', () => {
    it('resolves the correct URL and returns XML text', async () => {
      const xml = '<definitions></definitions>'
      fetchMock.mockResolvedValue({ ok: true, text: () => Promise.resolve(xml) })

      const { fetchBpmnXml } = useBpmn()
      const result = await fetchBpmnXml('diagram.bpmn')

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/diagram.bpmn')
      expect(result).toBe(xml)
    })

    it('throws on non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404 })

      const { fetchBpmnXml } = useBpmn()
      await expect(fetchBpmnXml('missing.bpmn')).rejects.toThrow('404')
    })

    it('throws on network error', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'))

      const { fetchBpmnXml } = useBpmn()
      await expect(fetchBpmnXml('any.bpmn')).rejects.toThrow('fetch failed')
    })
  })

  describe('withLoading', () => {
    it('returns result and clears loading on success', async () => {
      const { loading, error, withLoading } = useBpmn()

      const result = await withLoading(async () => 'success')

      expect(result).toBe('success')
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('captures error message and returns undefined on failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const { loading, error, withLoading } = useBpmn()

      const result = await withLoading(async () => {
        throw new Error('boom')
      })

      expect(result).toBeUndefined()
      expect(loading.value).toBe(false)
      expect(error.value).toContain('boom')
    })

    it('formats non-Error exceptions', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const { error, withLoading } = useBpmn()

      await withLoading(async () => {
        throw 'string error'
      })

      expect(error.value).toContain('string error')
    })

    it('resets error on subsequent successful call', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const { error, withLoading } = useBpmn()

      await withLoading(async () => {
        throw new Error('first failure')
      })
      expect(error.value).toContain('first failure')

      await withLoading(async () => 'ok')
      expect(error.value).toBeNull()
    })
  })
})
