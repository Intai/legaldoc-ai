/**
 * Triggers a browser file download by creating a temporary anchor element.
 * The filename is determined by the server's Content-Disposition header.
 * @param {string} url - The URL of the file to download
 */
export function downloadFile(url) {
  const link = window.document.createElement('a')
  link.href = url
  link.download = ''
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
}

/**
 * Navigates the browser to the given path.
 * @param {string} path - The path to navigate to
 */
/* istanbul ignore next */
export function navigateTo(path) {
  window.location.assign(path)
}
