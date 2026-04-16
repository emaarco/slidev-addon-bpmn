import.meta.env.BASE_URL = '/'

// vitest 4.x with jsdom does not auto-advance requestAnimationFrame in real-timer mode.
// Replace it with an immediate setTimeout so component polling resolves in tests.
global.requestAnimationFrame = (cb) => setTimeout(cb, 0) as unknown as number
