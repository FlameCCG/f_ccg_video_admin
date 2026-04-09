/**
 * English - Banner Management Module
 */
export default {
  title: 'Banners',
  list: {
    title: 'Banner List',
    cover: 'Image',
    href: 'Link',
    type: 'Type',
    showStatus: 'Status',
    partition: 'Partition',
  },
  filter: {
    type: 'Type',
    typePlaceholder: 'Select type',
    showStatus: 'Status',
    showStatusPlaceholder: 'Select status',
    partition: 'Partition',
    partitionPlaceholder: 'Select partition',
  },
  type: {
    carousel: 'Home/Partition Carousel',
    header: 'Header Banner',
    profile: 'Profile Banner',
  },
  status: {
    show: 'Visible',
    hide: 'Hidden',
  },
  statusBadge: {
    defaultUserBanner: 'System Default',
    registerDefaultBanner: 'Registration Default',
  },
  form: {
    createTitle: 'Create Banner',
    editTitle: 'Edit Banner',
    cover: 'Image',
    coverRequired: 'Please upload an image',
    coverTip: 'Recommended size: 1920x480, JPG/PNG supported, max 5MB',
    href: 'Link',
    hrefPlaceholder: 'Enter link URL (optional)',
    type: 'Type',
    typePlaceholder: 'Select type',
    showStatus: 'Visibility',
    partition: 'Partition',
    partitionPlaceholder: 'Select partition',
  },
  actions: {
    create: 'Create Banner',
    setRegisterDefaultBanner: 'Set as Registration Default Banner',
    manageDefaultUserBanners: 'Add or Remove Profile Defaults',
  },
  setRegisterDefaultBanner: {
    title: 'Set Registration Default Banner',
    confirm: 'Set this banner as the default homepage banner used during registration?',
  },
  defaultUserBanners: {
    title: 'Manage Default Profile Banners',
    actionLabel: 'Action',
    add: 'Add to default list',
    remove: 'Remove from default list',
    selectedCount: '{count} banner(s) selected',
    selectedIds: 'Banner IDs',
  },
  summary: {
    registerDefaultBanner: 'Registration Default Banner',
    defaultBannerList: 'System Default Profile Banner List',
    empty: 'No configuration',
  },
  delete: {
    title: 'Delete Banner',
    confirm: 'Are you sure you want to delete {count} banner(s)? This action cannot be undone.',
  },
  tips: {
    createSuccess: 'Banner created successfully',
    updateSuccess: 'Banner updated successfully',
    deleteSuccess: 'Banner deleted successfully',
    setRegisterDefaultBannerSuccess: 'Registration default banner updated successfully',
    addDefaultUserBannerSuccess: 'Added to the system default profile banner list',
    removeDefaultUserBannerSuccess: 'Removed from the system default profile banner list',
    invalidDefaultBannerSelection: 'Only visible profile banners can be used for this action',
  },
}
