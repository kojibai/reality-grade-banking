# Asset page browser response

Public production probes on 2026-10-20 found the shared `/asset/sports%3Arsc_f5fd8828f263f697/` page and its image route returning an empty HTTP 400 with no Content-Type. The direct `/api/asset?asset=sports%3Arsc_f5fd8828f263f697` endpoint returned HTTP 200 and the correct HTML. The same endpoint with a trailing slash reproduced the 400.

The handler now accepts both slash forms of its function path. HTML responses explicitly declare `text/html; charset=utf-8` and inline disposition; image requests still declare `image/png`. Invalid addresses are readable, non-cacheable text responses beneath the same HTML content type. Query and source-ID validation remains unchanged. HEAD requests still do no source reads or rendering.

Regression checks cover the rewritten slash path, inline HTML, explicit PNG, opaque source IDs, malformed arguments and read-free HEAD. Production verification of the corrected canonical route requires the user to push and deploy the committed build; these local checks do not establish a deployed result.
