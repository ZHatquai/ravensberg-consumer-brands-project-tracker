# Email templates — Ravensberg Project Tracker

The texts entered in the Supabase dashboard (Authentication → Email Templates) on 9 October 2026. The dashboard is the only place they live; this file is the record for the handover. Sender: the Resend SMTP sender entered under Project Settings → Authentication → SMTP Settings (a verified subdomain of sustainos.io).

Two templates are in use. Sign-ups are off and there is no password, so Confirm signup, Reset password, Change email and Reauthentication never fire; they carry a neutral one-liner in case a setting ever changes.

Variables Supabase fills in: `{{ .ConfirmationURL }}` (the one-time link), `{{ .SiteURL }}` (the live address), `{{ .Email }}` (the recipient). Brand per `.claude/skills/ravensberg-brand/SKILL.md`: Soft Stone background, white card, Ravensberg Green title, Source Sans 3 body with the Arial fallback, no gradients, no decoration. The logo is the PNG served by the live site; clients that block images show the alt text.

## 1. Magic Link (the login email)

Subject:

```
Your login link for the Ravensberg Project Tracker
```

Body:

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4EF;padding:32px 16px;font-family:'Source Sans 3','Segoe UI',Arial,sans-serif;color:#333333;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #DDDBD3;border-radius:6px;">
        <tr>
          <td style="padding:28px 32px 0 32px;">
            <img src="https://sustainability-project-tracker.netlify.app/assets/ravensberg-logo.png" alt="Ravensberg Consumer Brands" width="180" style="display:block;width:180px;height:auto;border:0;">
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0 32px;">
            <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6B6B6B;">Project Tracker</p>
            <h1 style="margin:0 0 16px 0;font-family:Montserrat,'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:600;color:#0F6B3A;">Your login link</h1>
            <p style="margin:0 0 16px 0;font-size:16px;line-height:24px;">Click the button to open the Ravensberg Project Tracker. The link signs you in as {{ .Email }}.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px 32px;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0F6B3A;color:#FFFFFF;text-decoration:none;font-family:Montserrat,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 22px;border-radius:4px;">Open the Project Tracker</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0 32px;">
            <p style="margin:0 0 12px 0;font-size:14px;line-height:21px;color:#333333;">The link works once and for one hour. If it has expired, request a new one on the login page.</p>
            <p style="margin:0 0 12px 0;font-size:14px;line-height:21px;color:#333333;">If you did not ask for this link, ignore this email. Nobody can sign in without it.</p>
            <p style="margin:0 0 24px 0;font-size:13px;line-height:20px;color:#6B6B6B;">If the button does not work, copy this address into your browser:<br><a href="{{ .ConfirmationURL }}" style="color:#0F6B3A;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px 32px;border-top:1px solid #DDDBD3;">
            <p style="margin:0;font-size:12px;line-height:18px;color:#6B6B6B;">Ravensberg Consumer Brands | Group Sustainability | Internal<br>Questions about access: Group Sustainability, z.hatquai@sustainos.io</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

## 2. Invite user (the first email, sent by the platform owner from the dashboard)

Used when an identity is created with "Send invitation" in Authentication → Users. Users added on the Users screen get no email from Supabase; the ESG lead tells them to request their first link on the login page.

Subject:

```
Your access to the Ravensberg Project Tracker
```

Body:

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4EF;padding:32px 16px;font-family:'Source Sans 3','Segoe UI',Arial,sans-serif;color:#333333;">
  <tr>
    <td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #DDDBD3;border-radius:6px;">
        <tr>
          <td style="padding:28px 32px 0 32px;">
            <img src="https://sustainability-project-tracker.netlify.app/assets/ravensberg-logo.png" alt="Ravensberg Consumer Brands" width="180" style="display:block;width:180px;height:auto;border:0;">
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 0 32px;">
            <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#6B6B6B;">Project Tracker</p>
            <h1 style="margin:0 0 16px 0;font-family:Montserrat,'Segoe UI',Arial,sans-serif;font-size:22px;font-weight:600;color:#0F6B3A;">You have access to the Project Tracker</h1>
            <p style="margin:0 0 12px 0;font-size:16px;line-height:24px;">Group Sustainability has set up your access to the Ravensberg Project Tracker, the register of the energy, water and waste projects behind the 2030 targets.</p>
            <p style="margin:0 0 16px 0;font-size:16px;line-height:24px;">Click the button to open it for the first time. Your address is {{ .Email }}.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px 32px;">
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#0F6B3A;color:#FFFFFF;text-decoration:none;font-family:Montserrat,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 22px;border-radius:4px;">Open the Project Tracker</a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 0 32px;">
            <p style="margin:0 0 12px 0;font-size:14px;line-height:21px;">There is no password. Each time you sign in, enter your email on the login page and open the link we send you. The link works once and for one hour.</p>
            <p style="margin:0 0 12px 0;font-size:14px;line-height:21px;">Bookmark the tool: <a href="{{ .SiteURL }}" style="color:#0F6B3A;">{{ .SiteURL }}</a></p>
            <p style="margin:0 0 24px 0;font-size:13px;line-height:20px;color:#6B6B6B;">If the button does not work, copy this address into your browser:<br><a href="{{ .ConfirmationURL }}" style="color:#0F6B3A;word-break:break-all;">{{ .ConfirmationURL }}</a></p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px 32px;border-top:1px solid #DDDBD3;">
            <p style="margin:0;font-size:12px;line-height:18px;color:#6B6B6B;">Ravensberg Consumer Brands | Group Sustainability | Internal<br>Questions about access: Group Sustainability, z.hatquai@sustainos.io</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
```

## 3. The templates that never fire

Sign-ups are off, there is no password and no screen changes an email address, so these are never sent. A neutral body in each, so nothing off-brand goes out if a setting ever changes:

- Confirm signup, subject `Ravensberg Project Tracker`: `<p style="font-family:'Source Sans 3','Segoe UI',Arial,sans-serif;color:#333333;">Access to the Ravensberg Project Tracker is set up by Group Sustainability, not by signing up. If you expected access, write to z.hatquai@sustainos.io.</p>`
- Reset password, subject `Ravensberg Project Tracker`: `<p style="font-family:'Source Sans 3','Segoe UI',Arial,sans-serif;color:#333333;">The Ravensberg Project Tracker has no password. Enter your email on the login page and open the link we send you.</p>`
- Change email address, subject `Ravensberg Project Tracker`: `<p style="font-family:'Source Sans 3','Segoe UI',Arial,sans-serif;color:#333333;">An email change was requested for the Ravensberg Project Tracker. If this was not you, write to z.hatquai@sustainos.io. Otherwise confirm here: <a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>`
- Reauthentication, subject `Your code for the Ravensberg Project Tracker`: `<p style="font-family:'Source Sans 3','Segoe UI',Arial,sans-serif;color:#333333;">Your code: {{ .Token }}</p>`

## Settings that go with them

- Authentication → Sign In / Providers → Email: "Email OTP expiration" 3600 seconds (one hour, the maximum), which the texts promise.
- Authentication → Rate Limits → emails per hour: 30 with custom SMTP.
- Authentication → URL Configuration: Site URL `https://sustainability-project-tracker.netlify.app` (what `{{ .SiteURL }}` prints) and the two redirect patterns of docs/supabase-setup.md §7.
