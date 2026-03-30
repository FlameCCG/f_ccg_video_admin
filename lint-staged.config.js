export default {
  '*.{js,ts,vue}': ['eslint --fix', 'prettier --write'],
  '*.{css,scss,vue}': ['stylelint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
}
