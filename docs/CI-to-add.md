What you have now is already solid for a startup-stage product. Here's what I'd recommend adding, in order of impact:

**High impact, add now:**

1. **Uptime monitoring** — If your app goes down at 3am, you should know before your users do. Free tools like [UptimeRobot](https://uptimerobot.com) or [Better Stack](https://betterstack.com) ping your URL every minute and alert you via email/Slack.

2. **Error tracking** — Right now if a user hits a bug, you'd never know unless they tell you. [Sentry](https://sentry.io) (free tier) catches runtime errors in both your API and frontend, shows you the stack trace, which user hit it, and how often it happens. Next.js has a first-party Sentry integration.

3. **Branch protection rules** — Right now anyone (you) can push directly to main. On GitHub, go to Settings > Branches > Add rule for `main`: require PR reviews, require CI to pass before merge. Forces you to go through the PR workflow even when you're tempted to push directly.

**Medium impact, add when you have users:**

4. **Analytics** — [PostHog](https://posthog.com) (free, self-hostable) or [Vercel Analytics](https://vercel.com/analytics). Know which features people actually use, where they drop off, page load times. Without this you're building blind.

5. **Database backups** — Neon has point-in-time recovery, but make sure it's enabled and you know how to restore. Test it once. The worst time to learn your backup system is when you need it.

6. **Log aggregation** — When something goes wrong in production, `console.error` vanishes into the void. A service like [Axiom](https://axiom.co) (free tier) or Vercel's built-in logs gives you searchable, persistent logs.

**Nice to have, add later:**

7. **Prettier** — Auto-formats code so you never argue about style. Many of your lint errors would disappear.
8. **Lighthouse CI** — Automated performance scoring on every PR.
9. **Staging environment** — Deploy PRs to preview URLs (Vercel does this automatically).
