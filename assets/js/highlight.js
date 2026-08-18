/* Classic script (no ES modules) — see tools/demodulize.py. */
(function (global) {
'use strict';

/* ==========================================================================
   highlight.js — syntax colour for .code-block listings
   ==========================================================================

   Vendored Prism (assets/js/vendor/prism.js) does the tokenising. This file
   maps the human language label already in .code-block__lang onto a Prism
   grammar and highlights in place. No network, no autoloader, no CDN.

   Colour is a supplement, never the only cue (WCAG 1.4.1): keywords are also
   bold, comments are also italic, and the language label stays in the header.

   Prism is loaded with data-manual so it does not highlight before the
   language classes exist.
   ========================================================================== */

var Prism = global.Prism;
if (!Prism) {
  return;
}

Prism.languages.pseudocode = Prism.languages.extend('clike', {
  comment: [
    {pattern: /(^|[^\\])%.*/, lookbehind: true},
    {pattern: /(^|[^\\])#.*/, lookbehind: true},
    {pattern: /(^|[^\\])\/\/.*/, lookbehind: true}
  ],
  string: {
    pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
    greedy: true
  },
  keyword: /\b(?:and|do|else|elseif|end|exit|false|for|foreach|function|if|in|loop|not|of|or|procedure|repeat|return|swap|then|to|true|until|while)\b/i,
  number: /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
  operator: /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
  punctuation: /[{}[\];(),.:]/
});

var LANG_FROM_LABEL = {
  bash: 'bash',
  python: 'python',
  matlab: 'matlab',
  'matlab session': 'matlab',
  markdown: 'markdown',
  pseudocode: 'pseudocode'
};

/**
 * Map a visible language label to a Prism grammar name.
 *
 * @param {string} label Text from .code-block__lang
 * @returns {string} Prism language id, or "none"
 */
function languageFromLabel(label) {
  var key = String(label || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return LANG_FROM_LABEL[key] || 'none';
}

/**
 * Colour every listing on the page from its existing language label.
 *
 * @returns {void}
 */
function highlightCodeBlocks() {
  var blocks = document.querySelectorAll('.code-block');
  var i;
  for (i = 0; i < blocks.length; i += 1) {
    var block = blocks[i];
    var langEl = block.querySelector('.code-block__lang');
    var code = block.querySelector('pre > code');
    if (!code) {
      continue;
    }
    var lang = languageFromLabel(langEl ? langEl.textContent : '');
    code.classList.add('language-' + lang);
    Prism.highlightElement(code);
  }
}

highlightCodeBlocks();

}(typeof window !== 'undefined' ? window : this));
