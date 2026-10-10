# Adding a country

1. Read the tax authority's **official** documentation first. Do not guess protocols, tax codes or signing rules.
2. Create `fiscal/countries/<cc>.js` (ISO alpha-2, lowercase file name). Copy `zw.js` as a template. It must provide
   `buildRequest(standardTx, ctx)` and `validate(request, ctx)`, list `supportedDeviceAdapters`, and keep honest
   `docs.verified / docs.unverified / docs.notImplemented` lists. Register it with `AureumFiscal.registerCountry('<CC>', adapter)`.
3. Device protocols go in `fiscal/devices/<id>.js` (`registerDeviceAdapter`), listing the `countries` they are approved for.
4. Load both with `<script>` tags in `backoffice.html` / `pos-checkout.html` and add them to `sw.js` SHELL. Nothing else in checkout changes.
5. Add the catalogue rows (see the seed in `supabase/fiscalisation-v2.sql`) with status `in_development`.
6. Test against the authority's test environment. Only a **super admin** can then set it to *Approved* (needs the authority's approval reference).
