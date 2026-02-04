const API_BASE =
  typeof import.meta.env.VITE_API_BASE === 'string' &&
  import.meta.env.VITE_API_BASE.length > 0
    ? import.meta.env.VITE_API_BASE.replace(/\/$/, '')
    : ''

export { API_BASE }
