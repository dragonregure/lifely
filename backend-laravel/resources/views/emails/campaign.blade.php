<!doctype html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ $campaign->subject }}</title>
</head>
<body style="margin:0;background:#f8fafc;color:#0f172a;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;border-bottom:1px solid #e2e8f0;background:#ffffff;">
              <img src="{{ $logoUrl }}" alt="Lifely" width="132" style="display:block;width:132px;max-width:100%;height:auto;">
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0284c7;">Listing update</p>
              <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:700;color:#0f172a;">{{ $campaign->subject }}</h1>
              <div style="font-size:15px;line-height:1.7;color:#334155;">{!! nl2br(e($campaign->body), false) !!}</div>

              @if ($listing !== null && $listingDetails !== null)
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;">
                  <tr>
                    <td style="padding:20px;">
                      <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0369a1;">Featured listing</p>
                      <h2 style="margin:0;font-size:19px;line-height:1.35;color:#0f172a;">{{ $listing->title }}</h2>
                      <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#475569;">{{ $listing->address }}</p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;">
                        <tr>
                          <td style="padding:10px 12px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
                            <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;">Price</p>
                            <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#0f172a;">{{ $listingDetails['price'] }}</p>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#334155;">
                        {{ $listingDetails['bedrooms'] }} bedrooms &bull; {{ $listingDetails['bathrooms'] }} bathrooms &bull; {{ $listingDetails['type'] }} &bull; {{ $listingDetails['status'] }}
                      </p>
                    </td>
                  </tr>
                </table>
              @endif
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5;">
              Sent from Lifely CRM on behalf of your real estate team.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
