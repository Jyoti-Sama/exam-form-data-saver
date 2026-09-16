// Remembers the last form field you clicked into on the page, so the side
// panel can drop a value straight into it.

let lastField = null;

function isFillable(el) {
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return !el.disabled;
  if (tag !== 'INPUT') return false;
  const type = (el.type || 'text').toLowerCase();
  const skip = ['checkbox', 'radio', 'file', 'submit', 'button', 'reset', 'image'];
  return !skip.includes(type) && !el.disabled && !el.readOnly;
}

document.addEventListener(
  'focusin',
  (e) => {
    if (isFillable(e.target)) lastField = e.target;
  },
  true
);

// React and other frameworks ignore a plain `.value =` assignment,
// so set it through the native property descriptor instead.
function setNativeValue(el, value) {
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  if (desc && desc.set) desc.set.call(el, value);
  else el.value = value;
}

function fillSelect(el, value) {
  const wanted = String(value).trim().toLowerCase();
  const match = Array.from(el.options).find(
    (o) =>
      o.value.trim().toLowerCase() === wanted ||
      o.text.trim().toLowerCase() === wanted
  );
  if (!match) return false;
  el.value = match.value;
  return true;
}

function describe(el) {
  return (
    el.getAttribute('aria-label') ||
    el.getAttribute('placeholder') ||
    el.name ||
    el.id ||
    el.tagName.toLowerCase()
  );
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'formsheet-fill') return false;

  // Frames with nothing focused stay silent, so the frame that actually
  // holds the field is the one that answers.
  if (!isFillable(lastField) || !lastField.isConnected) return false;

  const el = lastField;
  let done = true;

  if (el.tagName.toUpperCase() === 'SELECT') {
    done = fillSelect(el, msg.value);
  } else {
    setNativeValue(el, msg.value);
  }

  if (done) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.focus();
    el.style.transition = 'outline-color .4s';
    const prev = el.style.outline;
    el.style.outline = '2px solid #0b6e4f';
    setTimeout(() => (el.style.outline = prev), 700);
  }

  sendResponse({ ok: done, field: describe(el) });
  return false;
});
