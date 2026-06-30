import { describe, it, expect } from 'vitest'
import { suggestEmail, formatDate, formatDateShort } from '@/lib/utils'

describe('suggestEmail', () => {
  it('retorna null para e-mail já correto', () => {
    expect(suggestEmail('user@gmail.com')).toBeNull()
    expect(suggestEmail('user@hotmail.com')).toBeNull()
    expect(suggestEmail('user@icloud.com')).toBeNull()
  })

  it('sugere correção de typo comum (gmial → gmail)', () => {
    expect(suggestEmail('user@gmial.com')).toBe('user@gmail.com')
  })

  it('sugere correção de hotmali → hotmail', () => {
    expect(suggestEmail('user@hotmali.com')).toBe('user@hotmail.com')
  })

  it('sugere correção de outlok → outlook', () => {
    expect(suggestEmail('user@outlok.com')).toBe('user@outlook.com')
  })

  it('retorna null para domínio muito diferente (sem sugestão)', () => {
    expect(suggestEmail('user@empresa-corporativa.com')).toBeNull()
  })

  it('retorna null quando não há @ no e-mail', () => {
    expect(suggestEmail('sematsign')).toBeNull()
  })

  it('retorna null para string vazia', () => {
    expect(suggestEmail('')).toBeNull()
  })

  it('preserva a parte local exata', () => {
    const result = suggestEmail('Bruno.Lima@gmial.com')
    expect(result).toBe('Bruno.Lima@gmail.com')
  })
})

describe('formatDate', () => {
  it('formata data ISO para dd mon. aaaa em pt-BR', () => {
    const result = formatDate('2024-01-15')
    expect(result).toContain('15')
    expect(result).toContain('2024')
  })

  it('não lança erro para datas válidas', () => {
    expect(() => formatDate('2025-12-31')).not.toThrow()
    expect(() => formatDate('2000-01-01')).not.toThrow()
  })
})

describe('formatDateShort', () => {
  it('formata data ISO sem o ano', () => {
    const result = formatDateShort('2024-03-20')
    expect(result).toContain('20')
    expect(result).not.toContain('2024')
  })
})
