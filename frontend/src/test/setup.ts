import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// @testing-library/react's automatic cleanup only self-registers when it detects
// Vitest's *global* test hooks. This project imports describe/it/expect explicitly
// (no `globals: true`), so cleanup is wired up by hand here instead — otherwise
// each render() leaks into the next test's DOM.
afterEach(() => {
  cleanup()
})
