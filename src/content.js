(() => {
  'use strict';

  const ATTR = 'data-cliplight-enhanced';
  const FIELD_SELECTOR = '.slds-form-element';
  const LABEL_SELECTOR = '.slds-form-element__label, .test-id__field-label';
  const CONTROL_SELECTOR = '.slds-form-element__control';
  const HIGHLIGHTS_VALUE_SELECTOR = [
    'lightning-formatted-text',
    'lightning-formatted-rich-text',
    'lightning-formatted-name',
    'lightning-formatted-email',
    'lightning-formatted-phone',
    'lightning-formatted-url',
    'lightning-formatted-number',
    'lightning-formatted-date-time',
    'lightning-formatted-date',
    'lightning-formatted-time',
    'lightning-formatted-address',
    'lightning-formatted-location',
    'lightning-formatted-lookup',
    'force-lookup',
    'records-hoverable-link'
  ].join(',');
  const HIGHLIGHTS_PANEL_TAGS = new Set([
    'RECORDS-HIGHLIGHTS2',
    'RECORDS-LWC-HIGHLIGHTS-PANEL',
    'RECORDS-HIGHLIGHTS',
    'FORCE-HIGHLIGHTS-STENCIL'
  ]);
  const EMPTY_VALUES = new Set(['', '--', '—', '-', 'None', '(none)']);

  const COPY_SVG =
    '<svg class="cliplight-icon" viewBox="0 0 24 24" aria-hidden="true">' +
      '<rect x="9" y="9" width="11" height="11" rx="2"></rect>' +
      '<path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"></path>' +
    '</svg>';

  const CHECK_SVG =
    '<svg class="cliplight-icon" viewBox="0 0 24 24" aria-hidden="true">' +
      '<polyline points="5 12.5 10 17.5 19 7"></polyline>' +
    '</svg>';

  const CSS_TEXT = `
    .cliplight-btn {
      position: absolute;
      top: 2px;
      right: 4px;
      width: 22px;
      height: 22px;
      padding: 0;
      margin: 0;
      border: 0;
      background: transparent;
      border-radius: 4px;
      color: #7c4dff;
      cursor: pointer;
      opacity: 0;
      pointer-events: none;
      transition: opacity .12s ease, background-color .12s ease, color .12s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      -webkit-font-smoothing: antialiased;
    }
    .cliplight-btn--with-native { right: 30px; }
    .cliplight-btn--inline {
      position: static;
      display: inline-flex;
      vertical-align: middle;
      margin-left: 6px;
      width: 18px;
      height: 18px;
      transform: none;
    }
    .cliplight-btn--inline .cliplight-icon { width: 12px; height: 12px; }
    .cliplight-btn--inline {
      pointer-events: auto;
    }
    *:has(> .cliplight-btn--inline):hover .cliplight-btn--inline,
    *:has(.cliplight-btn--inline):hover > .cliplight-btn--inline,
    .cliplight-btn--inline:hover,
    .cliplight-btn--inline:focus,
    .cliplight-btn--inline:focus-visible {
      opacity: 1;
    }
    .cliplight-icon {
      width: 13px; height: 13px;
      stroke: currentColor; stroke-width: 1.8;
      stroke-linecap: round; stroke-linejoin: round;
      fill: none; display: block;
    }
    .slds-form-element:hover .cliplight-btn,
    [data-cliplight-enhanced]:hover .cliplight-btn,
    [data-cliplight-enhanced]:focus-within .cliplight-btn {
      opacity: 1;
      pointer-events: auto;
    }
    .cliplight-btn:hover { background-color: rgba(124, 77, 255, 0.10); }
    .cliplight-btn:focus,
    .cliplight-btn:focus-visible {
      outline: none;
      opacity: 1;
      pointer-events: auto;
      background-color: rgba(124, 77, 255, 0.10);
      box-shadow: 0 0 0 1px rgba(124, 77, 255, 0.35);
    }
    .cliplight-btn--success {
      background-color: rgba(124, 77, 255, 0.14);
      color: #6a3df0;
      opacity: 1 !important;
      pointer-events: auto;
    }
    @media (prefers-reduced-motion: reduce) {
      .cliplight-btn { transition: none; }
    }
  `;

  // ---------- Stylesheet management ----------
  let sharedSheet = null;
  try {
    sharedSheet = new CSSStyleSheet();
    sharedSheet.replaceSync(CSS_TEXT);
  } catch (_) {
    sharedSheet = null;
  }
  const stylesAppliedTo = new WeakSet();

  function ensureStyles(rootNode) {
    if (!rootNode || stylesAppliedTo.has(rootNode)) return;
    const isShadow = rootNode instanceof ShadowRoot;
    const isDoc = rootNode === document || rootNode.nodeType === 9;
    if (!isShadow && !isDoc) return;

    if (sharedSheet && 'adoptedStyleSheets' in rootNode) {
      try {
        rootNode.adoptedStyleSheets = [...rootNode.adoptedStyleSheets, sharedSheet];
        stylesAppliedTo.add(rootNode);
        return;
      } catch (_) { /* fallback below */ }
    }

    const style = document.createElement('style');
    style.setAttribute('data-cliplight-style', '');
    style.textContent = CSS_TEXT;
    if (isShadow) {
      rootNode.appendChild(style);
    } else {
      (document.head || document.documentElement).appendChild(style);
    }
    stylesAppliedTo.add(rootNode);
  }

  // ---------- Deep DOM helpers (shadow piercing) ----------
  const VALUE_SELECTORS = [
    '.slds-form-element__static',
    'lightning-formatted-text',
    'lightning-formatted-rich-text',
    'lightning-formatted-name',
    'lightning-formatted-email',
    'lightning-formatted-phone',
    'lightning-formatted-url',
    'lightning-formatted-number',
    'lightning-formatted-date-time',
    'lightning-formatted-date',
    'lightning-formatted-time',
    'lightning-formatted-address',
    'lightning-formatted-location',
    'lightning-formatted-lookup',
    'force-lookup',
    'records-formula-output',
    'records-hoverable-link'
  ];

  function isInteractiveOrIcon(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.classList && el.classList.contains('cliplight-btn')) return true;
    const tag = el.tagName.toLowerCase();
    if (tag === 'button') return true;
    if (tag === 'lightning-button-icon') return true;
    if (tag === 'lightning-primitive-icon') return true;
    if (tag === 'lightning-button-menu') return true;
    if (tag === 'lightning-icon') return true;
    if (tag === 'svg') return true;
    if (el.classList && (
        el.classList.contains('slds-button') ||
        el.classList.contains('slds-button_icon') ||
        el.classList.contains('slds-assistive-text')
    )) return true;
    return false;
  }

  const BLOCK_TAGS = new Set([
    'DIV', 'P', 'LI', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'PRE', 'BLOCKQUOTE'
  ]);

  function deepInnerText(node, skipFn) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType === 1) {
      if (skipFn && skipFn(node)) return '';
      if (node.tagName === 'BR') return '\n';
    }
    let text = '';
    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      text += deepInnerText(children[i], skipFn);
    }
    if (node.shadowRoot) text += deepInnerText(node.shadowRoot, skipFn);
    if (node.nodeType === 1 && BLOCK_TAGS.has(node.tagName) && text && !text.endsWith('\n')) {
      text += '\n';
    }
    return text;
  }

  function deepQuery(root, selector) {
    if (!root) return null;
    if (root.querySelector) {
      const direct = root.querySelector(selector);
      if (direct) return direct;
    }
    let all;
    try { all = root.querySelectorAll('*'); } catch (_) { return null; }
    for (let i = 0; i < all.length; i++) {
      if (all[i].shadowRoot) {
        const found = deepQuery(all[i].shadowRoot, selector);
        if (found) return found;
      }
    }
    return null;
  }

  function extractValue(control) {
    for (let i = 0; i < VALUE_SELECTORS.length; i++) {
      const el = deepQuery(control, VALUE_SELECTORS[i]);
      if (el) {
        const t = cleanText(deepInnerText(el, isInteractiveOrIcon));
        if (t && !EMPTY_VALUES.has(t)) return t;
      }
    }
    const fallback = cleanText(deepInnerText(control, isInteractiveOrIcon));
    if (fallback && !EMPTY_VALUES.has(fallback)) return fallback;
    return null;
  }

  function cleanText(s) {
    if (!s) return '';
    return s
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/g, '');
  }

  function hasEnhancedAncestor(el) {
    let cur = el.parentNode;
    while (cur) {
      if (cur.nodeType === 11 && cur.host) {
        cur = cur.host;
        continue;
      }
      if (cur.nodeType === 1 && cur.hasAttribute && cur.hasAttribute(ATTR)) return true;
      cur = cur.parentNode;
    }
    return false;
  }

  function isInHighlightsPanel(el) {
    let cur = el.parentNode;
    while (cur) {
      if (cur.nodeType === 11 && cur.host) {
        cur = cur.host;
        continue;
      }
      if (cur.nodeType === 1 && cur.tagName && HIGHLIGHTS_PANEL_TAGS.has(cur.tagName)) {
        return true;
      }
      cur = cur.parentNode;
    }
    return false;
  }

  function* iterAllRoots(start) {
    const stack = [start];
    while (stack.length) {
      const root = stack.pop();
      yield root;
      let all;
      try { all = root.querySelectorAll('*'); } catch (_) { continue; }
      for (let i = 0; i < all.length; i++) {
        const sr = all[i].shadowRoot;
        if (sr) stack.push(sr);
      }
    }
  }

  // ---------- Clipboard ----------
  async function copyToClipboard(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (err) {
        console.warn('[Cliplight] Copy failed', err);
        return false;
      }
    }
  }

  // ---------- Button factory ----------
  function makeButton(value, label) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cliplight-btn';
    btn.setAttribute('aria-label', label ? `Copy ${label}` : 'Copy field value');
    btn.setAttribute('tabindex', '0');
    btn.innerHTML = COPY_SVG;

    let resetTimer = null;
    const onTrigger = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const ok = await copyToClipboard(value);
      if (!ok) return;
      btn.classList.add('cliplight-btn--success');
      btn.innerHTML = CHECK_SVG;
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        btn.classList.remove('cliplight-btn--success');
        btn.innerHTML = COPY_SVG;
      }, 850);
    };

    btn.addEventListener('click', onTrigger);
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') onTrigger(e);
    });
    btn.addEventListener('mousedown', (e) => e.stopPropagation());

    return btn;
  }

  // ---------- Enhancement ----------
  function enhanceField(formEl) {
    if (!(formEl instanceof Element)) return;
    if (formEl.hasAttribute(ATTR)) return;
    if (hasEnhancedAncestor(formEl)) return;

    const label = formEl.querySelector(LABEL_SELECTOR);
    const control = formEl.querySelector(CONTROL_SELECTOR);
    if (!control) return;

    const value = extractValue(control);
    if (!value) return;

    const labelText = label ? cleanText(deepInnerText(label, isInteractiveOrIcon)) : '';
    formEl.setAttribute(ATTR, 'true');

    if (getComputedStyle(control).position === 'static') {
      control.style.position = 'relative';
    }

    const hasNativeEdit = !!control.querySelector(
      'button.slds-button_icon, button[title*="Edit" i], lightning-primitive-icon[icon-name*="edit" i]'
    );

    const btn = makeButton(value, labelText);
    btn.classList.toggle('cliplight-btn--with-native', hasNativeEdit);
    control.appendChild(btn);

    ensureStyles(formEl.getRootNode());
  }

  function enhanceHighlightsValue(valueEl) {
    if (!(valueEl instanceof Element)) return;
    if (valueEl.hasAttribute(ATTR)) return;
    // Skip if already covered by Details path
    if (hasEnhancedAncestor(valueEl)) return;
    // Only inside the highlights panel
    if (!isInHighlightsPanel(valueEl)) return;

    const value = cleanText(deepInnerText(valueEl, isInteractiveOrIcon));
    if (!value || EMPTY_VALUES.has(value)) return;
    // Skip "Phone (2)"-style multi-value labels (no real value to copy)
    if (/^\s*\(\s*\d+\s*\)\s*$/.test(value)) return;

    // Escape ancestors that clip content (slds-truncate) so the button stays visible
    let anchor = valueEl;
    let p = valueEl.parentNode;
    for (let i = 0; i < 3; i++) {
      if (!p || p.nodeType !== 1) break;
      const clips = p.classList && (
        p.classList.contains('slds-truncate') ||
        p.classList.contains('slds-truncate_container')
      );
      if (!clips) break;
      anchor = p;
      p = p.parentNode;
    }
    const parent = anchor.parentNode;
    if (!parent) return;

    valueEl.setAttribute(ATTR, 'true');

    const btn = makeButton(value, '');
    btn.classList.add('cliplight-btn--inline');
    if (anchor.nextSibling) {
      parent.insertBefore(btn, anchor.nextSibling);
    } else {
      parent.appendChild(btn);
    }

    ensureStyles(parent.getRootNode());
  }

  function scanAll() {
    ensureStyles(document);
    for (const root of iterAllRoots(document)) {
      let fields, highlightVals;
      try { fields = root.querySelectorAll(FIELD_SELECTOR); } catch (_) { fields = []; }
      try { highlightVals = root.querySelectorAll(HIGHLIGHTS_VALUE_SELECTOR); } catch (_) { highlightVals = []; }
      for (let i = 0; i < fields.length; i++) enhanceField(fields[i]);
      for (let i = 0; i < highlightVals.length; i++) enhanceHighlightsValue(highlightVals[i]);
    }
  }

  // ---------- Scheduling ----------
  let scanScheduled = false;
  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    setTimeout(() => {
      scanScheduled = false;
      scanAll();
    }, 300);
  }

  function init() {
    ensureStyles(document);
    scanAll();
    // Re-try a few times early — record pages render in waves
    setTimeout(scanAll, 800);
    setTimeout(scanAll, 2000);

    const obs = new MutationObserver((muts) => {
      for (let i = 0; i < muts.length; i++) {
        if (muts[i].addedNodes.length > 0) { scheduleScan(); return; }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(scheduleScan, 400);
        setTimeout(scheduleScan, 1500);
      }
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
