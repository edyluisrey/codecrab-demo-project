import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { describe, expect, it } from 'vitest'

import { toApiError } from './client'

function axiosError(status: number | null, data?: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig
  const response =
    status === null
      ? undefined
      : ({ status, statusText: '', headers: {}, config, data } as AxiosResponse)
  return new AxiosError(`Request failed with status code ${status}`, 'ERR', config, undefined, response)
}

describe('toApiError', () => {
  it('uses the backend detail string and code', () => {
    const error = axiosError(409, { detail: 'Email taken', code: 'email_taken' })

    expect(toApiError(error)).toEqual({ status: 409, code: 'email_taken', message: 'Email taken' })
  })

  it('joins validation error messages', () => {
    const error = axiosError(422, {
      code: 'validation_error',
      detail: [
        { loc: ['body', 'email'], msg: 'value is not a valid email address', type: 'value_error' },
        { loc: ['body', 'password'], msg: 'String should have at least 8 characters', type: 'string_too_short' },
      ],
    })

    expect(toApiError(error)).toEqual({
      status: 422,
      code: 'validation_error',
      message: 'value is not a valid email address; String should have at least 8 characters',
    })
  })

  it('falls back to the axios message when the body has no detail', () => {
    expect(toApiError(axiosError(502))).toEqual({
      status: 502,
      code: 'http_error',
      message: 'Request failed with status code 502',
    })
  })

  it('reports network failures when there is no response', () => {
    expect(toApiError(axiosError(null))).toEqual({
      status: null,
      code: 'network_error',
      message: 'Unable to reach the server',
    })
  })

  it('handles non-axios errors', () => {
    expect(toApiError(new Error('boom'))).toEqual({
      status: null,
      code: 'unknown_error',
      message: 'An unexpected error occurred',
    })
  })
})
