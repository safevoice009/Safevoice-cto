# Manual Testing Guide for High-Contrast Themes

## Quick Start Testing

### 1. Theme Persistence Test
**Steps:**
1. Build and run the application: `npm run build && cd dist && python3 -m http.server 8080`
2. Open http://localhost:8080 in browser
3. Locate the theme toggle button (Sun/Moon icon) in navbar
4. Click the toggle button to switch themes
5. Verify the page colors change immediately
6. Refresh the page (Ctrl+R or Cmd+R)
7. **Expected:** Theme persists - colors should match your last selection

**Verify localStorage:**
1. Open browser DevTools (F12)
2. Go to Application → Local Storage → http://localhost:8080
3. Look for key `safevoice:theme`
4. **Expected:** Value should be either `'light-hc'` or `'dark-hc'`

### 2. Font Selection Test
**Steps:**
1. Locate the font dropdown (shows "Default Font" or selected font name) in navbar
2. Click the dropdown to open menu
3. Select "OpenDyslexic (Dyslexia-Friendly)"
4. **Expected:** Text should render in a different font (more blocky, dyslexia-friendly)
5. Select "Comic Sans Pro"
6. **Expected:** Text should render in comic sans font
7. Select "Default Font"
8. **Expected:** Text should return to system default
9. Refresh page
10. **Expected:** Font selection persists

**Verify localStorage:**
1. In LocalStorage, look for key `safevoice:fontProfile`
2. **Expected:** Value should be `'default'`, `'dyslexic'`, or `'comic-sans'`

### 3. Light Theme Colors Test

**Text Visibility:**
- Black text (#000000) on white background (#ffffff)
- **Expected:** Crystal clear, maximum readability
- Copy any paragraph text and verify it's readable
- Use browser zoom (Ctrl+/Cmd+) to 150% - still readable

**Primary Button Colors:**
- Buttons should be blue (#0066cc)
- Click on any button (Crisis Help, etc.)
- **Expected:** Clear blue button, white text
- On hover, button should darken (#0052a3)

**Alert/Error Colors:**
- Error text should be red (#d32f2f)
- Success text should be green (#0b8620)
- **Expected:** High contrast, easy to distinguish

### 4. Dark Theme Colors Test

**Text Visibility:**
- White text (#ffffff) on black background (#000000)
- **Expected:** Maximum contrast for night use
- Copy any paragraph text and verify it's readable

**Primary Button Colors:**
- Buttons should be bright yellow (#ffd800)
- **Expected:** Very bright and visible
- On hover, button should darken (#d4a700)

**Alert/Error Colors:**
- Error text should be bright red (#ff1744)
- Success text should be bright green (#00e676)
- Warning text should be bright orange (#ffc400)
- **Expected:** High visibility, distinct colors

### 5. Keyboard Navigation Test

**Theme Toggle:**
1. Press Tab repeatedly until the Sun/Moon icon is focused
2. **Expected:** 3px blue/yellow border visible around button
3. Press Enter or Space
4. **Expected:** Theme toggles
5. Verify focus is still visible

**Font Dropdown:**
1. Press Tab until font dropdown is focused
2. **Expected:** 3px blue/yellow border visible
3. Press Enter or Space to open
4. **Expected:** Dropdown menu appears
5. Press Down Arrow to navigate options
6. **Expected:** Options highlight as you navigate
7. Press Enter to select
8. **Expected:** Dropdown closes, font changes
9. Press Tab and Shift+Tab to navigate between controls
10. **Expected:** Focus outline always visible

**Focus Order:**
1. In desktop navbar: Language Switcher → Theme → Font → Notifications → Crisis Help
2. **Expected:** Logical left-to-right tab order

### 6. Mobile Responsiveness Test

**Desktop to Mobile:**
1. Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Select iPhone 12 or similar
3. **Expected:** Theme and font controls in mobile menu (hamburger)
4. Click hamburger menu
5. **Expected:** Menu shows controls after language switcher
6. Verify all dropdowns work on mobile
7. Verify touch targets are at least 48x48 pixels

### 7. WCAG Contrast Verification

**Using axe DevTools (recommended):**
1. Install axe DevTools browser extension
2. Open SafeVoice application
3. Open axe DevTools (usually in DevTools)
4. Click "Scan ALL of my page"
5. **Expected:** No color contrast violations in "Light" or "Dark" issues
6. Switch theme and rescan
7. **Expected:** Still no violations

**Manual Testing with Color Picker:**
1. Use a color contrast checker: https://webaim.org/resources/contrastchecker/
2. Pick any text color from page using browser inspector
3. Pick background color
4. **Expected:** Ratio ≥ 7:1 for normal text, ≥ 4.5:1 for large text

### 8. Font Loading Test

**On Slow Network:**
1. Open DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Hard refresh (Ctrl+Shift+R)
4. **Expected:** Fonts load but text is readable with fallback immediately
5. After fonts load (status 200), text style changes slightly

**Font Files Present:**
1. Open DevTools → Network tab
2. Filter for "fonts"
3. Switch to dyslexic font
4. **Expected:** OpenDyslexic-Regular.ttf and/or Bold.ttf requests
5. Status should be 200 or 304 (cached)

### 9. Screen Reader Test (if available)

**NVDA (Windows) or JAWS:**
1. Enable screen reader
2. Navigate to theme button
3. **Expected:** "Toggle dark mode" or similar announcement
4. Activate button
5. **Expected:** No errors, theme changes
6. Navigate to font dropdown
7. **Expected:** "Font, popup button" or similar
8. Open dropdown
9. **Expected:** Options announced with current selection
10. Select option
11. **Expected:** "Font selected" or similar announcement

### 10. Persistence Across Different Pages

**Cross-Page Test:**
1. Set theme to light and font to dyslexic
2. Navigate to different pages (Feed, Communities, etc.)
3. **Expected:** Theme and font persist across navigation
4. Go to new browser tab, same origin
5. **Expected:** Theme and font carry over
6. Close and reopen browser completely
7. **Expected:** Theme and font still persist

## Browser Compatibility Testing

Test each browser:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

**For each browser:**
1. Verify theme switching works
2. Verify font selection works
3. Verify persistence works
4. Verify focus indicators are visible
5. Verify colors are correct

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Theme not changing | Store hydration failed | Check localStorage permissions |
| Fonts not loading | CORS or file path issue | Verify `/public/fonts/` exists, check network tab |
| Focus outline not visible | CSS override | Check no `outline: none` in conflicting styles |
| Colors look wrong | Theme not applied | Check `data-theme` attribute on `<html>` element |
| Mobile controls not visible | Responsive design issue | Test with actual mobile device |

## Performance Checklist

- [ ] Theme changes instantly (no lag)
- [ ] Font changes instantly (or with brief fallback)
- [ ] No console errors on load
- [ ] DevTools Network tab shows ≤500ms load time
- [ ] lighthouse reports no font loading issues
- [ ] Build size reasonable (fonts add ~584 KB)

## Accessibility Checklist

- [ ] Tab through all controls - focus always visible
- [ ] All buttons are keyboard operable
- [ ] Color combinations meet WCAG AAA
- [ ] Font sizes remain readable
- [ ] Zoom to 200% - layout doesn't break
- [ ] Screen reader announces controls correctly
- [ ] No flashing/animation hazards
- [ ] Dyslexic font actually loads and applies

## Sign-Off Checklist

- [ ] Theme persistence works (light & dark)
- [ ] Font persistence works (3 options)
- [ ] Keyboard navigation works
- [ ] WCAG AAA contrast verified
- [ ] Focus indicators visible
- [ ] Responsive design works
- [ ] No console errors
- [ ] Localization works (all 6 languages)
- [ ] Cross-browser compatible
- [ ] Screen reader compatible

---

## Test Report Template

**Date:** ____________________
**Tester:** ____________________
**Browser:** ____________________
**OS:** ____________________

### Results:
- Theme Switching: ✓ PASS / ✗ FAIL
- Font Selection: ✓ PASS / ✗ FAIL
- Persistence: ✓ PASS / ✗ FAIL
- Keyboard Navigation: ✓ PASS / ✗ FAIL
- WCAG Contrast: ✓ PASS / ✗ FAIL
- Mobile Responsive: ✓ PASS / ✗ FAIL

### Issues Found:
1. ____________________
2. ____________________
3. ____________________

### Notes:
____________________
