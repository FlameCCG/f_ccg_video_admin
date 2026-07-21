/**
 * English - Notification Management Module
 */
export default {
  title: 'Notifications',
  list: {
    pageTitle: 'Site Notifications',
    title: 'Title',
    content: 'Content',
    receiver: 'Receiver',
    senderAvatar: 'Avatar',
    sender: 'Sender',
    link: 'Link',
    createdAt: 'Created At',
  },
  receiver: {
    all: 'All Users',
    specific: 'Specific User',
  },
  form: {
    createTitle: 'Send Notification',
    editTitle: 'Edit Notification',
    title: 'Title',
    titlePlaceholder: 'Enter notification title',
    titleRequired: 'Please enter notification title',
    content: 'Content',
    contentPlaceholder: 'Enter notification content',
    contentRequired: 'Please enter notification content',
    receiver: 'Receiver',
    receiverIdPlaceholder: 'Enter user ID',
    link: 'Link',
    linkPlaceholder: 'Link, e.g. example.com or http://example.com (optional)',
    videoId: 'Related Video',
    videoIdPlaceholder: 'Enter video ID (optional)',
    videoTitle: 'Video Title',
    videoTitlePlaceholder: 'Enter video title (optional)',
  },
  actions: {
    create: 'Send Notification',
  },
  delete: {
    title: 'Delete Notification',
    confirm:
      'Are you sure you want to delete {count} notification(s)? This action cannot be undone.',
  },
  tips: {
    createSuccess: 'Notification sent successfully',
    updateSuccess: 'Notification updated successfully',
    deleteSuccess: 'Notification deleted successfully',
  },
}
