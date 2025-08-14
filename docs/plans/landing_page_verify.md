I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim:

---
## Comment 8: `params` is typed as Promise and awaited; Next.js App Router passes `params` synchronously.

Change signatures to synchronous params:
- `type IIndexProps = { params: { locale: string } }` and use `const { locale } = props.params;`
- Apply the same change in `src/app/[locale]/(marketing)/layout.tsx` and `about/page.tsx`.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/src/app/[locale]/(marketing)/page.tsx
- /Users/v/works/Next-js-Boilerplate/src/app/[locale]/(marketing)/layout.tsx
- /Users/v/works/Next-js-Boilerplate/src/app/[locale]/(marketing)/about/page.tsx
---
## Comment 9: Duplicate feature section headers between `page.tsx` and `FeatureGrid.tsx` causing repeated content.

In `src/app/[locale]/(marketing)/page.tsx`, remove the features section header and render only `<FeatureGrid />`. Keep the header within `FeatureGrid.tsx` where it’s already implemented.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/src/app/[locale]/(marketing)/page.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/FeatureGrid.tsx
---
## Comment 10: Optional translation check is ineffective; `t('features_subtitle')` always returns a string.

In `src/app/[locale]/(marketing)/page.tsx`, avoid using `t('features_subtitle')` as a boolean. Either:
- Add the `features_subtitle` translation and always render it; or
- Use `useMessages()`/`getMessages()` to check if `messages.Index?.features_subtitle` exists before rendering.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/src/app/[locale]/(marketing)/page.tsx
---
## Comment 11: Hard-coded English strings should be internationalized for consistency.

Internationalize hard-coded strings:
- `Hero.tsx`: add keys for the four feature badges (e.g., `hero_badge_tracking`, `hero_badge_analytics`, `hero_badge_goals`, `hero_badge_reminders`) in `Index` and replace literals.
- `FeatureGrid.tsx`: move the section subtitle and bottom CTA texts to `Index` (e.g., `features_subtitle`, `features_bottom_cta_title`, `features_bottom_cta_get_started`, `features_bottom_cta_view_demo`). Update `fr.json`/`zh.json` accordingly.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/Hero.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/FeatureGrid.tsx
- /Users/v/works/Next-js-Boilerplate/src/locales/en.json
- /Users/v/works/Next-js-Boilerplate/src/locales/fr.json
- /Users/v/works/Next-js-Boilerplate/src/locales/zh.json
---
## Comment 12: Storybook stories pass an unsupported `locale` prop to `Hero`; better isolate locale via provider only.

In `src/components/marketing/Hero.stories.tsx`, remove `argTypes/args` for `locale` and set locale via a global or use a custom `render` that wraps `<Hero />` without passing args. Keep locale selection in the decorator provider logic.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/Hero.stories.tsx
---

