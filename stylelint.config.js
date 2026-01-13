/** @type {import('stylelint').Config} */
export default {
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-standard-vue/scss',
    'stylelint-config-recess-order',
  ],
  overrides: [
    {
      files: ['**/*.vue'],
      customSyntax: 'postcss-html',
    },
  ],
  rules: {
    'selector-class-pattern': null,
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'layer',
          'theme',
          'use',
          'forward',
          'each',
          'if',
          'else',
        ],
      },
    ],
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'variants',
          'responsive',
          'screen',
          'layer',
          'theme',
          'use',
          'forward',
          'each',
          'if',
          'else',
        ],
      },
    ],
    'no-descending-specificity': null,
    'scss/no-global-function-names': null,
    // 允许 SCSS 变量前空行
    'scss/dollar-variable-empty-line-before': null,
    // 允许自定义属性前空行（用于分组）
    'custom-property-empty-line-before': null,
    // 允许重复选择器（用于 SCSS 循环生成）
    'no-duplicate-selectors': null,
    // 允许 rgba 函数（兼容性更好）
    'color-function-notation': null,
    'color-function-alias-notation': null,
    // 允许小数形式的 alpha 值
    'alpha-value-notation': null,
    // 允许完整的十六进制颜色
    'color-hex-length': null,
    // 放宽属性顺序规则
    'order/properties-order': null,
  },
  ignoreFiles: ['dist/**', 'node_modules/**'],
}
