This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Install and run the storefront with Bun:

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Before starting, copy `.env.example` to a local environment file and configure
Supabase plus the selected payment provider. Keep every non-`NEXT_PUBLIC_`
credential server-only.

## Validation

```bash
bun run typecheck
bun run test
bun run lint
bun run build
```

## Refund processor

Refund requests are claimed and sent to Razorpay only by
`/api/internal/refunds/process`. Configure a scheduler to call that route with
`Authorization: Bearer <CRON_SECRET>`. Razorpay's signed
`refund.processed`/`refund.failed` webhooks remain the terminal source of truth.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!



Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
