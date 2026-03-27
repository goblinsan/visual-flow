# Mobile Flow Launch Checklist

> Issue #223 – Analytics instrumentation and rollout readiness

This document tracks all items that must be confirmed before the mobile-first
guided flow is considered production-ready.

---

## 1. End-to-End Test Coverage (Issue #221)

- [x] `MobileFlowShell.test.tsx` – all 6 entry-point paths exercised  
- [x] `MobileColorPickStep.test.tsx` – palette grid, selection, CTA, back nav  
- [x] `MobileTemplatePickStep.test.tsx` – template gallery, selection, CTA, back nav  
- [x] `MobileRefineStep.test.tsx` – mood chips, industry dropdown, validation hint  
- [x] `MobileComponentStep.test.tsx` – button / card / nav selectors, defaults  
- [x] `MobilePreviewScreen.test.tsx` – summary panel, confirm CTA, back nav  
- [x] `snapshotBuilder.test.ts` – token generation, mood palettes, font overrides  
- [x] `mobileFlowSession.test.ts` – save / load / clear session persistence  
- [x] `flowValidation.test.ts` – guards, conflict detection, desktop-only nav  
- [x] `telemetry.test.ts` – all 11 mobile analytics events  

---

## 2. Usability & Accessibility (Issue #222)

- [x] Validation hint shown when CTA is disabled in `MobileRefineStep` ("Select at least one mood")  
- [x] All component option buttons carry `aria-label` (button, card, and nav selectors)  
- [x] "Use this design" CTA in `MobilePreviewScreen` has an `aria-label`  
- [ ] Keyboard focus is trapped within each step (no focus escaping to background)  
- [ ] Flow tested on real devices: iPhone SE (375 px), Pixel 6 (412 px), iPad mini (768 px)  
- [ ] Flow tested with VoiceOver (iOS) and TalkBack (Android)  
- [ ] All interactive targets are ≥ 44 × 44 px  
- [ ] Colour contrast ratios meet WCAG 2.1 AA (≥ 4.5:1 for text, 3:1 for UI)  
- [ ] Long-press / swipe interactions do not trigger unintended actions  
- [ ] Tested by ≥ 5 representative users unfamiliar with the product  

---

## 3. Analytics Instrumentation (Issue #223)

- [x] `src/mobile/telemetry.ts` created with 11 typed event helpers  
- [x] `MobileFlowShell` fires `mobile_flow_started` on first entry selection  
- [x] `MobileFlowShell` fires `mobile_flow_step_viewed` on every step transition  
- [x] `MobileFlowShell` fires `mobile_flow_step_completed` (with duration) on each advance  
- [x] `MobileFlowShell` fires `mobile_flow_entry_selected` when an entry card is tapped  
- [x] Template pick fires `mobile_flow_template_selected` with `template_id`  
- [x] Component step fires `mobile_flow_components_selected` with all three style values  
- [x] Preview confirm fires `mobile_flow_completed` with mood, industry, and total duration  
- [x] Session resume fires `mobile_flow_session_resumed`  
- [x] CSS download fires `mobile_flow_tokens_downloaded`  
- [ ] Analytics provider (Plausible / gtag / PostHog) configured in production  
- [ ] Events verified in provider dashboard for at least one completed flow  
- [ ] `mobile_flow_abandoned` implemented (requires `visibilitychange` / `beforeunload` listener)  

---

## 4. Performance

- [ ] Time to Interactive (TTI) < 3 s on a mid-range Android device (throttled 3G)  
- [ ] No render-blocking network requests during the flow  
- [ ] Fonts load asynchronously (font-display: swap)  
- [ ] Images / assets used in MobileTemplatePickStep are lazy-loaded  
- [ ] Lighthouse Mobile Performance score ≥ 80  

---

## 5. Offline & Resilience

- [x] All flow steps function without a network connection  
- [x] Session state persisted to `localStorage` so progress survives page reloads  
- [ ] Graceful degradation if `localStorage` is unavailable (e.g. private browsing)  
- [ ] `localStorage` quota-exceeded error handled without crashing  

---

## 6. Design / Copy Review

- [ ] All step headings and descriptions reviewed by a non-technical user  
- [ ] Tooltip / hint copy proofread for grammar and clarity  
- [ ] Mood and industry labels consistent with the desktop Style Flow  
- [ ] "Design ready!" success message reviewed  

---

## 7. Release Gate

All of the following must be ✅ before merging to `main` / enabling the feature flag:

| Criterion | Status |
|---|---|
| All test suites pass (`npm test`) | ✅ |
| No TypeScript errors (`tsc --noEmit`) | ✅ |
| Lighthouse Mobile score ≥ 80 | ⬜ |
| Usability test with ≥ 5 users | ⬜ |
| Analytics events verified in dashboard | ⬜ |
| WCAG 2.1 AA contrast audit passed | ⬜ |
| PM / design sign-off | ⬜ |
