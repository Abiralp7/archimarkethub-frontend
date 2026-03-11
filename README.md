# Product Platform Frontend (Admin)

This is a minimal Next.js admin dashboard scaffold for the Product Platform.

Environment
- Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_API_URL` to your backend, e.g. `http://localhost:3000`.

Scripts
- `npm run dev` - start dev server
- `npm run build` - build
- `npm run start` - start built app
- `npm run lint` - lint
- `npm run format` - format

Features
- Login page (`/login`) authenticates against backend `/auth/login` and stores JWT in localStorage.
- Protected admin page `/admin/companies` that lists companies and supports soft-delete, restore, and permanent delete.

Notes
- This is a starter scaffold: expand components, add tests, and secure authentication flows as needed.