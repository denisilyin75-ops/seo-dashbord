import { useEffect, useRef } from 'react';

/**
 * Клавиатурные шорткаты с поддержкой:
 *   - одиночные:    "k", "?"
 *   - модификаторы: "Mod+k", "Ctrl+Shift+f"
 *   - последовательности (разделены пробелом): "g d", "n a"
 *
 * Mod = Cmd (macOS) или Ctrl (остальные).
 *
 * @param {string}   shortcut — описание шортката
 * @param {function} handler  — колбэк (e) => void
 * @param {object}   [opts]   — { allowInInput?: boolean, enabled?: boolean }
 */

/**
 * Универсальный хоткей для цифр 1..9 — принимает (digit, event).
 */
export function useDigitHotkey(handler, opts = {}) {
  const { allowInInput = false, enabled = true } = opts;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      const hasMod  = e.metaKey || e.ctrlKey || e.altKey;
      if (isInput && !allowInInput) return;
      if (hasMod) return;
      if (!/^[1-9]$/.test(e.key)) return;
      e.preventDefault();
      handlerRef.current?.(Number(e.key), e);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled, allowInInput]);
}

export default function useHotkeys(shortcut, handler, opts = {}) {
  const { allowInInput = false, enabled = true } = opts;
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !shortcut) return;
    const specs = parseShortcut(shortcut);
    if (!specs.length) return;

    const buffer = [];
    let timer = null;
    const resetBuffer = () => { buffer.length = 0; };

    const onKey = (e) => {
      // Не срабатываем в инпутах, кроме случаев с Mod или allowInInput
      const tag = (e.target.tagName || '').toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      const hasMod  = e.metaKey || e.ctrlKey;
      if (isInput && !allowInInput && !hasMod) return;

      buffer.push(e);
      if (buffer.length > specs.length) buffer.shift();
      clearTimeout(timer);
      timer = setTimeout(resetBuffer, 1000);

      if (buffer.length === specs.length) {
        const ok = specs.every((spec, i) => matches(buffer[i], spec));
        if (ok) {
          e.preventDefault();
          e.stopPropagation();
          handlerRef.current?.(e);
          resetBuffer();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [shortcut, enabled, allowInInput]);
}

function parseShortcut(s) {
  return s.trim().split(/\s+/).map((part) => {
    const tokens = part.toLowerCase().split('+');
    const modifiers = new Set();
    let key = '';
    for (const t of tokens) {
      if (t === 'mod' || t === 'cmd' || t === 'ctrl') modifiers.add('mod');
      else if (t === 'shift') modifiers.add('shift');
      else if (t === 'alt' || t === 'option') modifiers.add('alt');
      else key = t;
    }
    return { key, mod: modifiers.has('mod'), shift: modifiers.has('shift'), alt: modifiers.has('alt') };
  });
}

function matches(e, spec) {
  const hasMod = e.metaKey || e.ctrlKey;
  const key = (e.key || '').toLowerCase();
  // Нормализуем некоторые спец-клавиши
  const normalized = key === 'escape' ? 'esc' : key;
  if (spec.mod   !== hasMod)      return false;
  if (spec.shift && !e.shiftKey)  return false;
  // Не требуем отсутствия shift для "?" — браузер всё равно сообщает shift+?
  if (spec.alt   && !e.altKey)    return false;
  return normalized === spec.key;
}
