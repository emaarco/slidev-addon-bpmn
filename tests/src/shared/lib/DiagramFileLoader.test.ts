import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DiagramFileLoader } from '../../../../src/shared/lib/DiagramFileLoader'

describe('DiagramFileLoader', () => {
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
      const { loading, error } = new DiagramFileLoader('BPMN')
      expect(loading.value).toBe(true)
      expect(error.value).toBeNull()
    })
  })

  describe('fetchFile', () => {
    it('resolves the correct URL and returns XML text', async () => {
      const xml = '<definitions></definitions>'
      fetchMock.mockResolvedValue({ ok: true, text: () => Promise.resolve(xml) })

      const loader = new DiagramFileLoader('BPMN')
      const result = await loader.fetchFile('diagram.bpmn')

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/diagram.bpmn')
      expect(result).toBe(xml)
    })

    describe('when the deck is served from a sub-path', () => {
      beforeEach(() => {
        vi.stubEnv('BASE_URL', '/deck/')
        fetchMock.mockResolvedValue({ ok: true, text: () => Promise.resolve('') })
      })

      afterEach(() => {
        vi.unstubAllEnvs()
      })

      it('keeps a root-relative path inside the base', async () => {
        await new DiagramFileLoader('BPMN').fetchFile('/diagram.bpmn')

        expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/deck/diagram.bpmn')
      })

      it('does not prefix a path that already carries the base', async () => {
        await new DiagramFileLoader('BPMN').fetchFile('/deck/diagram.bpmn')

        expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/deck/diagram.bpmn')
      })

      it('resolves a relative path against the base', async () => {
        await new DiagramFileLoader('BPMN').fetchFile('diagram.bpmn')

        expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/deck/diagram.bpmn')
      })
    })

    it('throws on non-ok response', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404 })

      const loader = new DiagramFileLoader('BPMN')
      await expect(loader.fetchFile('missing.bpmn')).rejects.toThrow('404')
    })

    it('names the diagram kind in the fetch error', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404 })

      const loader = new DiagramFileLoader('DMN')
      await expect(loader.fetchFile('missing.dmn')).rejects.toThrow('Failed to fetch DMN file: 404')
    })

    it('fetches the same path only once', async () => {
      fetchMock.mockResolvedValue({ ok: true, text: () => Promise.resolve('<definitions/>') })
      const loader = new DiagramFileLoader('BPMN')

      const results = await Promise.all([loader.fetchFile('diagram.bpmn'), loader.fetchFile('diagram.bpmn')])
      const later = await loader.fetchFile('diagram.bpmn')

      expect(fetchMock).toHaveBeenCalledOnce()
      expect(results).toEqual(['<definitions/>', '<definitions/>'])
      expect(later).toBe('<definitions/>')
    })

    it('fetches different paths separately', async () => {
      fetchMock.mockResolvedValue({ ok: true, text: () => Promise.resolve('') })
      const loader = new DiagramFileLoader('BPMN')

      await loader.fetchFile('first.bpmn')
      await loader.fetchFile('second.bpmn')

      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('fetches a path again after its fetch failed', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('<definitions/>') })
      const loader = new DiagramFileLoader('BPMN')
      await expect(loader.fetchFile('diagram.bpmn')).rejects.toThrow('503')

      const retried = await loader.fetchFile('diagram.bpmn')

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(retried).toBe('<definitions/>')
    })

    it('throws on network error', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'))

      const loader = new DiagramFileLoader('BPMN')
      await expect(loader.fetchFile('any.bpmn')).rejects.toThrow('fetch failed')
    })
  })

  describe('withLoading', () => {
    it('returns result and clears loading on success', async () => {
      const loader = new DiagramFileLoader('BPMN')
      const { loading, error } = loader

      const result = await loader.withLoading(async () => 'success')

      expect(result).toBe('success')
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('captures error message and returns undefined on failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const loader = new DiagramFileLoader('BPMN')
      const { loading, error } = loader

      const result = await loader.withLoading(async () => {
        throw new Error('boom')
      })

      expect(result).toBeUndefined()
      expect(loading.value).toBe(false)
      expect(error.value).toContain('boom')
    })

    it('names the diagram kind in the load error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const loader = new DiagramFileLoader('DMN')
      const { error } = loader

      await loader.withLoading(async () => {
        throw new Error('boom')
      })

      expect(error.value).toBe('Failed to load DMN: boom')
    })

    it('is loading while the load runs', async () => {
      const loader = new DiagramFileLoader('BPMN')
      await loader.withLoading(async () => 'first')
      let loadingDuringLoad: boolean | undefined

      await loader.withLoading(async () => {
        loadingDuringLoad = loader.loading.value
      })

      expect(loadingDuringLoad).toBe(true)
    })

    it('clears the error of a failed load when loading again', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const loader = new DiagramFileLoader('BPMN')
      await loader.withLoading(async () => {
        throw new Error('boom')
      })

      await loader.withLoading(async () => 'success')

      expect(loader.error.value).toBeNull()
    })
  })
})
