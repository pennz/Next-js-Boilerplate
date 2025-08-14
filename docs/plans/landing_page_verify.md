I have the following verification comments after thorough review and exploration of the codebase. Implement the comments by following the instructions in the comments verbatim:

---
## Comment 1: Marketing components use default exports but are imported as named; index barrel re-exports are broken.

Fix imports/exports for marketing components. Update `src/components/marketing/index.ts` to re-export defaults as named: `export { default as Hero } from './Hero';` etc. Then in `src/app/[locale]/(marketing)/page.tsx`, import via `import { Hero, FeatureGrid, CTASection, TechStack } from '@/components/marketing';`.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/index.ts
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/Hero.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/CTASection.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/TechStack.tsx
- /Users/v/works/Next-js-Boilerplate/src/app/[locale]/(marketing)/page.tsx
---
## Comment 2: Components are passed unsupported props (`t`, `locale`) causing type errors and unused props.

In `src/app/[locale]/(marketing)/page.tsx`, remove unsupported props from `<Hero />`, `<FeatureGrid />`, and `<CTASection />`: render them as `<Hero />`, `<FeatureGrid />`, `<CTASection />`. Keep `TechStack` as `<TechStack />`.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/src/app/[locale]/(marketing)/page.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/Hero.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/FeatureGrid.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/CTASection.tsx
---
## Comment 3: Missing i18n keys used by components will render raw keys or break content.

Add missing translation keys.
- In `src/locales/en.json` > `Index`, add: `hero_title_highlight`, `hero_image_alt`, `hero_stat_users`, `hero_stat_uptime`, `hero_stat_rating`, `features_subtitle`, `sponsors_subtitle`.
- Create a new `TechStack` namespace in all locales (`en.json`, `fr.json`, `zh.json`) with: `title`, `subtitle`, `category_frontend`, `category_backend`, `category_database`, `category_auth`, `category_testing`, `category_deployment`, `nextjs_description`, `typescript_description`, `tailwind_description`, `react_description`, `clerk_description`, `drizzle_description`, `postgresql_description`, `vitest_description`, `playwright_description`, `storybook_description`, `eslint_description`, `vercel_description`, `cta_title`, `cta_description`, `cta_button_primary`, `cta_button_secondary`.
- Provide proper translations for FR/ZH.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/src/locales/en.json
- /Users/v/works/Next-js-Boilerplate/src/locales/fr.json
- /Users/v/works/Next-js-Boilerplate/src/locales/zh.json
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/Hero.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/TechStack.tsx
- /Users/v/works/Next-js-Boilerplate/src/app/[locale]/(marketing)/page.tsx
---
## Comment 4: About page uses new translation keys not present in locales, breaking content rendering.

Update the `About` namespace in `src/locales/en.json`, `fr.json`, and `zh.json` to include all keys used by `src/app/[locale]/(marketing)/about/page.tsx`: `mission_title`, `mission_description`, `mission_vision`, `features_title`, `feature_comprehensive_tracking`, `feature_comprehensive_tracking_desc`, `feature_predictive_analytics`, `feature_predictive_analytics_desc`, `feature_goal_management`, `feature_goal_management_desc`, `feature_behavior_insights`, `feature_behavior_insights_desc`, `technology_title`, `technology_description`, `security_title`, `security_description`, `security_encryption`, `security_authentication`, `security_privacy`, `security_compliance`, `contact_title`, `contact_description`, `contact_support`.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/src/app/[locale]/(marketing)/about/page.tsx
- /Users/v/works/Next-js-Boilerplate/src/locales/en.json
- /Users/v/works/Next-js-Boilerplate/src/locales/fr.json
- /Users/v/works/Next-js-Boilerplate/src/locales/zh.json
---
## Comment 5: E2E tests depend on data-testid attributes not present on components/sections.

Add data attributes:
- `Hero.tsx`: `<section data-testid="hero-section" ...>`
- `FeatureGrid.tsx`: root `<section data-testid="feature-grid" ...>`
- `TechStack.tsx`: root `<section data-testid="tech-stack" ...>`
- `CTASection.tsx`: root `<section data-testid="cta-section" ...>` and add `data-testid` to primary/secondary CTAs.
- Ensure selectors match `tests/e2e/LandingPage.e2e.ts`.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/Hero.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/FeatureGrid.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/TechStack.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/CTASection.tsx
- /Users/v/works/Next-js-Boilerplate/tests/e2e/LandingPage.e2e.ts
---
## Comment 6: Unit tests don’t match component structure; they assume roles and markup that don’t exist.

Update tests to match structure or add roles:
- Prefer selecting `FeatureGrid` by `data-testid="feature-grid"`.
- Either add `role="article"` to each feature card in `FeatureGrid.tsx` or modify tests to query by text/icon testids.
- Remove reliance on `role='main'` for component-level tests; query within the rendered container.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/FeatureGrid.tsx
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/FeatureGrid.test.tsx
---
## Comment 7: Images referenced are missing or invalid; placeholder PNGs are text files and one asset is absent.

Replace text files with real images under `public/assets/images/` (even a 1x1 transparent PNG). Add `feature-health-records.png` or remove the `image` property from that feature in `FeatureGrid.tsx`. Verify all referenced paths exist and load correctly with Next/Image.

### Referred Files
- /Users/v/works/Next-js-Boilerplate/public/assets/images/hero-health-dashboard.png
- /Users/v/works/Next-js-Boilerplate/public/assets/images/feature-analytics.png
- /Users/v/works/Next-js-Boilerplate/public/assets/images/feature-goals.png
- /Users/v/works/Next-js-Boilerplate/public/assets/images/feature-reminders.png
- /Users/v/works/Next-js-Boilerplate/src/components/marketing/FeatureGrid.tsx
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

