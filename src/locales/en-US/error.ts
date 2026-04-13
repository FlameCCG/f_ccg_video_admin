/**
 * Error Pages English Language Pack
 */
export default {
  goBack: 'Go Back',
  goHome: 'Go Home',
  forbidden: {
    title: '403 - Forbidden',
    description:
      'Sorry, you do not have permission to access this page. Please contact the administrator for access.',
  },
  notFound: {
    title: '404 - Not Found',
    description: 'Sorry, the page you are looking for does not exist. Please check the URL.',
  },
  menuComponent: {
    missingPathTitle: 'No frontend component is configured for “{title}”',
    unavailableTitle: 'The frontend file for “{title}” has not been created',
    missingPath: 'Set the component field in Menu Management before opening this page.',
    fileNotFound: 'The configured component file does not exist. Create it or correct the path.',
    renderError: 'The component exists but failed to load or render. Check its frontend code.',
    componentPath: 'Current component path',
  },
}
