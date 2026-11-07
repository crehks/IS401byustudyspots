# Sign-up confirmation emails (Supabase Auth)

Email confirmation is **on**: new accounts must click the emailed link before they can log in. Supabase's
built-in sender allows only a few emails per hour for the whole project, so for real use point Supabase at
your own SMTP account. These are dashboard settings (they hold credentials, so they are not in git).

## 1. SMTP (Authentication > Emails > SMTP Settings in the Supabase dashboard)

Using a Gmail account (a dedicated project account is better than a personal one):

1. In the Google account, turn on 2-Step Verification, then create an **App password**
   (myaccount.google.com/apppasswords). Copy the 16-character password.
2. In Supabase: Authentication > Emails > SMTP Settings > **Enable custom SMTP**, then fill in:
   - Sender email: the Gmail address
   - Sender name: `Nook`
   - Host: `smtp.gmail.com`
   - Port: `465`
   - Username: the full Gmail address
   - Password: the app password from step 1
3. Save. Then raise Authentication > Rate Limits > "Rate limit for sending emails" (default is low; 30 to 100 per hour is plenty).

Gmail allows roughly 500 emails a day, which is enough for a class project. For a public launch use a
verified domain with a transactional provider such as Resend instead (Resend cannot email anyone but the
account owner until a domain is verified).

## 2. URLs (Authentication > URL Configuration)

- **Site URL:** `https://crehks.github.io/IS401byustudyspots/`
- **Redirect URLs:** add `https://crehks.github.io/IS401byustudyspots/**` (and `http://127.0.0.1:4173/**` for local testing)

Without this, the confirmation link in the email sends people to `localhost`. After clicking the link the
app signs the person in automatically and shows "Email confirmed. Welcome!".

## 3. Optional: email text

Authentication > Emails > Templates > "Confirm sign up": change the subject to something like
`Confirm your Nook account`.
