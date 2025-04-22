/// <reference types="vitest" />
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'apps/functions/vitest.config.ts',
  'apps/web/vitest.config.ts'
])
