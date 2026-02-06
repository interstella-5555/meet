# Blisko — Project Notes

## Regenerating README screenshot

The README includes a screenshot of 4 design book screens (Login, OTP, Profile, Waves).
To regenerate it:

1. **Temporarily** add screenshot mode to the codebase:

   In `apps/design/src/components/design-book/Screens.tsx`, add an `onlyFirstRow` prop to `Screens` that renders only one `screenRow` with the 4 screens you want (e.g. LoginScreen, OtpScreen, ProfileScreen, WavesReceivedScreen).

   In `apps/design/src/routes/design-book.tsx`, detect `?screenshot` query param and render just `<Screens onlyFirstRow />` wrapped in `<div style={{ background: '#fff', padding: '48px 64px', display: 'inline-block' }}>`. Make sure hooks are called before the early return.

2. **Capture** the screenshot:
   ```bash
   npx capture-website-cli "http://localhost:3000/design-book?screenshot" \
     --width 1400 --scale-factor 2 --delay 3 --full-page \
     --disable-animations --hide-elements ".nav" \
     --output docs/screens-vN.png
   ```

3. **Update** `README.md` to point to the new filename.

4. **Revert** the temporary code changes:
   ```bash
   git checkout -- apps/design/src/routes/design-book.tsx apps/design/src/components/design-book/Screens.tsx
   ```

5. **Delete** the old screenshot file and commit.
