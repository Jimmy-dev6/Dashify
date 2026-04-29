# DASHIFY — CONTEXTE PARTAGÉ

> Fichier de référence consulté en début de chaque session, tous agents confondus. Dernière mise à jour : 29 avril 2026 (Phase 5 calendrier — booking details modal).

---

## 1. QUI EST L'UTILISATEUR

**Jimmy Khater** — dev solo, basé à **Dakar, Sénégal**. Construit **Dashify**, un SaaS de gestion de locations courte durée pour hôtes d'**Afrique de l'Ouest**, focus **Sénégal**.

**Compte Supabase login principal** : `jonatbeach68@gmail.com` (user_id `7d33542d-a7f5-4229-97eb-b649ea965a6b`).

**Style de travail attendu :**
- Fichiers complets à copier-coller plutôt que modifs incrémentales
- Avancement par paliers avec validation à chaque étape
- Test en local explicitement signalé avant push en prod
- PowerShell Windows + projet sur `C:\Users\Gamer\dashify\` — attention aux parenthèses dans les chemins (`(dashboard)`, `[reference]`, `(1).pdf`) qui sont interprétées comme wildcards par PowerShell : toujours utiliser `-LiteralPath` quand les chemins en contiennent
- Feedback visuel via screenshots
- Workflow git : `git add . → git commit -m "..." → git push` sur main, Vercel auto-deploy
- Pour gros fichiers .tsx : préférer copier-coller manuel dans Cursor (Ctrl+A, Delete, coller, Ctrl+S) plutôt que scripts PowerShell avec here-strings — bien plus fiable. **EXCEPTION** : pour TOUT nouveau fichier ou refonte complète d'un fichier .tsx avec accents, **utiliser PowerShell `[System.IO.File]::WriteAllText` avec UTF-8 sans BOM** au lieu du copy-paste Cursor. Voir piège dédié plus bas.
- Attention au bug "useState multiligne avec generics" lors de collage : les `<` d'ouverture peuvent se perdre, créant cascade d'erreurs TS "useState is not an array". Fix : remplacer par version inline single-line (`useState<{...}>(...)` sur une seule ligne)
- Navigateur Chrome/Edge utilise le dossier **`Downloads`** (EN) et pas `Téléchargements`. Piège classique : quand tu re-télécharges un même nom de fichier, Chrome ajoute `(1)`, `(2)`, `(3)` — **le plus récent est celui avec le plus grand numéro OU le plus récent LastWriteTime**, pas celui sans numéro. Toujours vérifier la taille du fichier (Length) en plus du nom pour éviter de copier une version cached.
- **Zombies Node récurrents en dev quand Cursor tourne** : Cursor lance des processus node pour son TS LSP/extensions qui NE prennent PAS les ports 3000-3002 (donc pas de conflit en général). Si malgré tout `npm run dev` se retrouve sur port 3001/3002, c'est qu'un ancien `npm run dev` est encore vivant. Routine : `Get-Process node | Stop-Process -Force`, et si ça re-spawn, **fermer Cursor complètement** (barre système incluse) avant de re-kill, puis relancer Cursor après que `npm run dev` soit Ready sur 3000.
- **Piège copy-paste TypeScript depuis le chat vers Cursor** (vécu 28 avril 2026, vol de 1h de session) : peut corrompre le fichier de 3 façons : (1) auto-conversion Markdown qui transforme `customer.name` en `[customer.name](http://customer.name)`, (2) encoding Windows-1252 au lieu d'UTF-8 (accents cassés en `â€"`, `Ã©`, `├®`), (3) balises `<a>` ouvrantes mangées au passage à la ligne, idem pour `<` de generics React. **Solution éprouvée** : pour les fichiers >100 lignes (ou tout nouveau composant .tsx), utiliser un script PowerShell avec here-string `@'...'@` + `[System.IO.File]::WriteAllText(path, content, [System.Text.UTF8Encoding]::new($false))`. Le `$false` force l'absence de BOM.
- **Piège placeholder `<XXX>` dans les SQL/scripts de test** : Jimmy laisse régulièrement le placeholder texto au lieu de le remplacer par la vraie valeur (vécu 4 fois en 2 sessions). **Convention adoptée** : quand un agent livre un test SQL avec `<BOOKING_ID>` ou similaire, livrer aussi la version pré-remplie avec un id réel récupérable depuis le contexte de la session.

---

## 2. LE PRODUIT DASHIFY

### Vision 1 ligne
Le seul SaaS de locations courte durée qui comprend le vrai workflow ouest-africain : WhatsApp + Mobile Money + événements locaux.

### Le workflow killer (pain point validé en interview)
Client WhatsApp demande résa → host bloque mentalement les dates → client disparaît sans payer → chambre bloquée pour rien.

**Solution Dashify en 5 étapes — ENTIÈREMENT LIVRÉE Phase 2 :**
1. Host crée un devis → dates bloquées 48h automatiquement ✅
2. Devis envoyé avec instructions paiement + lien page publique `/pay/DSHF-XXXX` ✅
3. Si paiement reçu → hôte clique "J'ai reçu le paiement" dans Dashify → devis accepté + booking créée automatiquement + calendrier confirmé ✅
4. Si pas paiement → devis expire, dates redispo ✅
5. Respecte la politique "Stricte" déjà en place ✅

### Différenciateurs clés
- Mobile Money natif (Orange Money, Wave, Free Money) — **sans intermédiation Dashify** (zéro risque réglementaire BCEAO, aucun KYC imposé aux hôtes)
- Calendrier des événements locaux SN (Tabaski, Korité, Magal, Gamou, CAN, Dakar Rally)
- Workflow devis → hold → paiement direct hôte → confirmation manuelle → booking confirmé
- UX pensée pour hôtes peu tech qui vivent sur WhatsApp
- Page publique de paiement brandée Dashify pour rassurer le client final — reste accessible APRÈS paiement confirmé (le client peut revenir consulter son devis)
- **Calendrier avec détails réservation au clic** (depuis 29 avril 2026) — affiche le nom du client sur les barres + modal détaillé au clic (logement, client, séjour, paiement, devis lié) + annulation de réservation en 2 clics

---

## 3. STACK TECHNIQUE

| Couche | Techno |
|---|---|
| Frontend | Next.js 14.2.28 (App Router, Server Actions) + TypeScript strict + Tailwind CSS |
| Backend | Next.js API routes + Server Actions |
| Base de données | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage (bucket `property-photos` public, 5MB, image/*) |
| DNS | Cloudflare (nameservers `jerry.ns.cloudflare.com` + `suzanne.ns.cloudflare.com`) |
| Email | Cloudflare Email Routing (`contact@dashify.africa` → `khaterjimmy@gmail.com`) |
| Hébergement | Vercel (production) |
| IDE | Cursor sur Windows, terminal PowerShell |
| Git | Workflow direct sur `main` (solo, pas de PR) |

**Infra prod :**
- Repo : https://github.com/Jimmy-dev6/Dashify
- Prod : **https://dashify.africa** (domaine custom live depuis 24 avril 2026)
- Prod legacy : https://dashify-plum.vercel.app (redirige/co-existe avec le custom)
- Local : `C:\Users\Gamer\dashify`
- Supabase : `isonhkrnwuhgwhfkumus.supabase.co`
- **Supabase plan : Free** (pas de backups auto, à passer en Pro au premier client payant)
- Registrar domaine : **Namecheap** (enregistrement Jimmy Khater particulier, Domain Privacy ON Free Forever, expire 24 avril 2028, auto-renew ON)
- **`next.config.mjs`** : `images.remotePatterns` whitelist `isonhkrnwuhgwhfkumus.supabase.co/storage/v1/object/public/**` pour permettre l'usage de `next/image` sur les photos de logements

---

## 4. ARCHITECTURE CLÉ

### Structure des dossiers Next.js — PIÈGE IMPORTANT
**Il existe DEUX dossiers `calendar/` distincts** dans `app/(dashboard)/` :
- `app/(dashboard)/calendar/` — **le vrai code du calendrier** : `calendar-view.tsx`, `booking-details-modal.tsx`, `page.tsx`
- `app/(dashboard)/dashboard/calendar/page.tsx` — fait juste un `redirect("/calendar")` (probablement un legacy de routing)

Quand on travaille sur le calendrier, **toujours pointer vers `app/(dashboard)/calendar/`**, jamais `app/(dashboard)/dashboard/calendar/`. Erreur vécue 29 avril 2026.

### `calendar_events` = source unique de vérité pour l'availability
9 colonnes : `id`, `property_id`, `channel_id`, `start_date`, `end_date`, `source`, `external_uid`, `status`, `created_at`

**Valeurs acceptées (CHECK constraints en DB)** :
- `source` : `airbnb`, `booking`, `dashify`, `other`, `quote_hold`
- `status` : `confirmed`, `cancelled`, `pending`

**Flux :**
- **Bookings → calendar_events automatique** via trigger `sync_booking_to_calendar_event_trigger` (rétabli 29 avril 2026, voir Décisions techniques) ; convention `external_uid='booking:<bookings.id>'`, `source='dashify'`
- Imports iCal → calendar_events (source='airbnb' ou 'booking') — UI livrée mais aucun import effectif au 29 avril 2026
- Holds de devis → calendar_events (source='quote_hold', status='pending', external_uid='quote:<id>')
- `checkAvailability()` dans `lib/availability.ts` lit calendar_events pour détecter les conflits

### Tables principales

`properties` (**26+ cols** dont `cover_image_url`, `photos` jsonb, **`updated_at` timestamptz NOT NULL DEFAULT NOW()** avec trigger `set_properties_updated_at` → `set_updated_at()` depuis 29 avril 2026)

`bookings` (cols minimales : `id`, `user_id`, `property_id`, `customer_id`, `check_in`, `check_out`, `guests`, `total`, `status`, `created_at`, `payment_transaction_id`, **`source` text NOT NULL DEFAULT 'direct'** depuis 29 avril 2026 — CHECK : `direct | airbnb | booking | vrbo | manual | other`, index `bookings_source_idx` ; **⚠️ PAS de colonne `quote_id` ni `updated_at`**)

`quotes` (24 cols dont `payment_reference` auto, `payment_confirmed_at`, `payment_confirmed_by`, `payment_method_used`, status = draft | sent | accepted | refused | expired, avec `expires_at`, `supplement_ids` **jsonb** et pas text[], `pricing_extras` jsonb ; trigger `set_quotes_updated_at` migré sur `set_updated_at()` depuis 29 avril 2026)

`calendar_events`, `customers` (id, user_id, name, phone, email, source, notes), `policies`, `pricing_rules`, `promotions`, `supplements`, `fees`, `profiles` (avec 5 colonnes `payment_*` Phase 2), `property_channels`, `local_events`, `messages`, `contact_tickets` (Phase 4 Chantier 3).

**Tables Phase 3 (Palier 1 SQL déjà créé mais pas exploité)** : `subscriptions`, `invoices`, `invoice_events`. RLS activée. Trigger auto crée une subscription en `status='trial'` avec `trial_ends_at = NOW() + 30 days` à chaque INSERT sur `profiles`. **Code non branché** — en pause en attendant décision business sur timing EI (voir section 10).

### Standard `updated_at` unifié (depuis 29 avril 2026)

**Toutes les tables avec `updated_at` pointent sur la même fonction `public.set_updated_at()`** :
- `properties` → `set_properties_updated_at`
- `quotes` → `set_quotes_updated_at` (migré depuis ancien `update_updated_at()`)
- `invoices` → `invoices_updated_at`
- `subscriptions` → `subscriptions_updated_at`

**Pour ajouter `updated_at` sur une nouvelle table** : créer simplement `BEFORE UPDATE` trigger qui appelle `public.set_updated_at()`. Pas créer de nouvelle fonction.

⚠️ **Ne PAS toucher** à `storage.update_updated_at_column()` qui appartient à Supabase (gère les tables internes du Storage). Les fonctions `update_updated_at()` et `update_updated_at_column()` du schéma `public` ont été droppées le 29 avril 2026 (orphelines).

### Trigger `sync_booking_to_calendar_event_trigger` (29 avril 2026)

Fonction `public.sync_booking_to_calendar_event()` (`SECURITY DEFINER`, `SET search_path = public`) attachée à `bookings` (`AFTER INSERT OR UPDATE OR DELETE`) :
- **INSERT booking confirmed** → crée calendar_event correspondant (`source='dashify'`, `status='confirmed'`, `external_uid='booking:<id>'`)
- **UPDATE status = 'cancelled'** → supprime le calendar_event lié
- **UPDATE dates ou retour à 'confirmed'** → DELETE-then-INSERT idempotent
- **DELETE booking** → supprime le calendar_event lié

**Filtrage `source = 'dashify'` dans tous les DELETE** : on ne touche jamais aux events Airbnb/Booking iCal, même en coïncidence.

Backfill exécuté 29 avril 2026 sur les 3 bookings démo (Cheikh Fall avril, et 2 démos juin).

⚠️ Le contexte précédent annonçait un trigger `trg_booking_calendar` documenté mais **disparu en pratique** (audit 29 avril 2026 a montré 0 trigger sur `bookings`). Le nouveau `sync_booking_to_calendar_event_trigger` rétablit officiellement ce comportement attendu.

### Colonnes paiement sur `profiles` (Phase 2 Palier 1)
- `payment_orange_money` : numéro OM hôte, format DB `7XXXXXXXX` (9 chiffres), contrainte CHECK
- `payment_wave` : numéro Wave, même format
- `payment_free_money` : numéro FM, même format
- `payment_holder_name` : nom titulaire (affiché au client pour confiance)
- `payment_instructions_extra` : note libre hôte (max 200 chars)

### Colonnes paiement sur `quotes` (Phase 2 Palier 1 + 3)
- `payment_confirmed_at` : timestamp confirmation manuelle par l'hôte
- `payment_confirmed_by` : uuid → profiles
- `payment_method_used` : `orange_money` | `wave` | `free_money` | `other`
- `payment_reference` : **text unique auto-généré à l'INSERT via trigger** au format `DSHF-XXXXXXXX` (8 premiers chars UUID uppercase)
- Contrainte CHECK de cohérence : les 3 colonnes confirmation doivent être NULL ensemble ou remplies ensemble

### Table `contact_tickets` (Phase 4 Chantier 3)
- Colonnes : `id uuid`, `name text`, `email text`, `message text`, `status text default 'new'`, `user_agent text`, `source text default 'contact_page'`, `ip_hash text`, `created_at timestamptz`
- CHECK constraints : name 2-100 chars, email regex, message 10-3000 chars, status ∈ (`new`, `read`, `replied`, `archived`, `spam`)
- 2 index : `created_at desc` + `status`
- RLS : **INSERT ouvert à anon+authenticated**, SELECT **bloqué** pour anon/authenticated (lecture via service_role/Table Editor uniquement)
- IP **hashée** SHA-256 avec salt (pas d'IP brute stockée, RGPD-friendly)

### Fichiers critiques (déjà en prod)

**Workflow killer (Phase 1 + 2)** :
- `lib/quotes/hold-calendar.ts` : `createQuoteHold`, `releaseQuoteHold`, `expireOverdueQuotes`
- `lib/payment/reference.ts` : helpers `formatReference`, `parseReference`
- `lib/profile/types.ts` : `ProfileRow` avec 5 colonnes `payment_*`, `PROFILE_DEFAULTS`
- `lib/quotes/wa-message.ts` : `buildQuoteWhatsAppMessage` avec bloc paiement
- `lib/quotes/profile-wa.ts` : `ProfileQuoteCtx` avec 5 cols payment_*
- `app/api/quotes/route.ts` : POST crée le hold + génère `wa_message`. Bloque si pas de config paiement
- `app/api/quotes/[id]/route.ts` : PATCH gère action `confirm_payment`. DELETE libère le hold
- `app/api/profile/route.ts` : GET/PATCH profile avec validation + normalisation numéros SN
- `app/(dashboard)/dashboard/settings/settings-view.tsx` : section "Paiement" dans Settings
- `app/(dashboard)/dashboard/quotes/quotes-view.tsx` : bouton "J'ai reçu le paiement" + modal 4 options
- `app/pay/[reference]/page.tsx` : page publique paiement brandée
- `app/pay/[reference]/payment-view.tsx` : 3 états (actif/expiré/payé)

**Photos (Phase 4 Chantier 2)** :
- `lib/photos/upload.ts` : `uploadPropertyPhoto`, `deletePropertyPhoto`, validation. Path convention : **`{user_id}/{propertyId}/{timestamp}-{safename}.{ext}`**
- `app/api/properties/[id]/photos/route.ts` : POST `upload` ou `set_as_cover` (swap atomique). DELETE
- `app/(dashboard)/dashboard/properties/property-form.tsx` : section Photos en mode édition
- `components/photo-uploader.tsx` : drag & drop, cover + galerie 10 max

**Contact (Phase 4 Chantier 3)** :
- `app/api/contact/route.ts` : POST public, validation, rate limit 5/h, IP hashée SHA-256, anti-spam
- `app/contact/page.tsx` + `app/contact/contact-form.tsx`
- `components/HelpICalModal.tsx` : modal d'aide iCal avec lien `/contact`

**Calendrier (Phase 5, 28-29 avril 2026)** :
- `app/(dashboard)/calendar/calendar-view.tsx` (~51 KB) : composant principal du calendrier mensuel. Affiche `customer_name` sur les barres dashify, barres cliquables, ouvre `BookingDetailsModal` au clic, filtre `quote_hold` et `cancelled` côté client. Conserve toute la logique existante (sélection 2 dates → création devis, daily preview pricing dynamique, etc.)
- `app/(dashboard)/calendar/booking-details-modal.tsx` (~18 KB) : modal détails réservation. Fetch `/api/bookings/[id]`, affiche logement (avec photo cover via `next/image`), client, séjour, paiement, devis lié. Bouton "Annuler la réservation" → `PATCH /api/bookings/[id]` → trigger DB nettoie le calendar_event automatiquement → callback `onCancelled` refetch les events. **Note** : labels en français mais sans accents (`reservation` au lieu de `réservation`) car le composant a été créé via PowerShell pour éviter les bugs d'encoding du copy-paste — à raffiner plus tard.
- `app/api/bookings/[id]/route.ts` : `GET` retourne booking + customer + property + quote enrichis (4 queries max, parallélisées). `PATCH` gère l'annulation (status='cancelled', RLS-safe via `eq("user_id", auth.uid())`)
- `app/api/calendar/events/route.ts` : enrichi avec `customer_name`, `booking_id`, `quote_id`, `external_uid`. Parse `external_uid` au format `booking:<uuid>` ou `quote:<uuid>`, batch fetch bookings + quotes + customers (3 queries max, no N+1). Dégradation gracieuse : si lookup customer plante, retourne quand même les events bruts.

### RLS policies Supabase
**Sur `quotes`/`properties`/`profiles`** (Phase 2 Palier 3 + bonus élargi) :
- `Public read quotes for payment page` : `status='sent' OR (status='accepted' AND payment_confirmed_at IS NOT NULL)`
- `Public read properties linked to public quotes` et `Public read host profiles linked to public quotes` suivent la même logique via sous-requête

**Sur bucket Storage `property-photos`** :
- `Public can view property photos` (SELECT, public, bucket_id match)
- `Users can upload their own property photos` (INSERT, authenticated, `storage.foldername(name)[1] = auth.uid()::text`)
- `Users can delete their own property photos` (DELETE, idem)

**Sur `contact_tickets`** (Phase 4 Chantier 3) :
- `Public can insert contact tickets` (INSERT, anon+authenticated, with check true)
- `Nobody reads contact tickets via anon` (SELECT, anon+authenticated, using false) — lecture via service_role dans Table Editor uniquement

**Sur tables Phase 3** (`subscriptions`, `invoices`, `invoice_events`) : policies SELECT only pour `authenticated` où `user_id = auth.uid()`. Writes passent par service_role (webhook + cron).

---

## 5. FEATURES LIVRÉES EN PROD

1. **Guide iCal** : PDF 13 pages (refresh 24 avril 2026 avec `dashify.africa`) + modal `HelpICalModal` + page publique `/aide/ical`
2. **Empty states Channel Manager** : gros bloc CTA teal + pastilles A/B grisées
3. **Dashboard enrichi** : graphique revenus recharts (3 mois passés + 3 futurs) + widget Prochaines arrivées + widget Événements locaux SN
4. **Formulaire logement enrichi** : 5 sections, 11 nouvelles colonnes Supabase, 16 amenities
5. **Infra photos** : bucket + 3 policies RLS + frontend complet (Phase 4 Chantier 2)
6. **Phase 1 Workflow Killer** : holds calendrier sur devis (commit `f7e95df`)
7. **Phase 2 COMPLÈTE (Option A+, Chemin 3)** : tous paliers 1 à 6 + Bonus RLS + Fix calendar-view
8. **Phase 3 Palier 1** (SQL uniquement) : 3 tables `subscriptions`, `invoices`, `invoice_events`. **Code non branché** — décision business en attente (voir section 10).
9. **Phase 4 Chantier 1 — Nettoyage data démo** : 3 logements + 5 clients + 3 devis + 3 bookings démos
10. **Phase 4 Chantier 2 — Upload photos frontend** (commit `aaf01cd`) : composant `<PhotoUploader>`, swap cover↔galerie
11. **Phase 4 Chantier 3 — Page `/contact`** (commit `40c2af1`) : form public + rate limiting + spam detection
12. **Chantier domaine + email pro** (24 avril 2026) : `dashify.africa` + Cloudflare DNS + Email Routing + SSL Vercel
13. **Refresh PDF iCal** (24 avril 2026) : guide 13 pages avec toutes URLs `dashify.africa`
14. **Phase 5 — `properties.updated_at`** (29 avril 2026) : colonne + trigger auto via `set_updated_at()`. Standard unifié sur 4 tables. Fonctions trigger orphelines droppées.
15. **Phase 5 — `bookings.source`** (29 avril 2026) : colonne text NOT NULL DEFAULT 'direct' avec CHECK 6 valeurs (`direct | airbnb | booking | vrbo | manual | other`) + index `bookings_source_idx`. Backfill 3 démos en `direct`.
16. **Phase 5 — Trigger sync bookings ↔ calendar_events** (29 avril 2026, commit `261beb3`) : trigger DB `sync_booking_to_calendar_event_trigger` qui maintient calendar_events automatiquement. Backfill des 3 démos. Rétablit le `trg_booking_calendar` qui était documenté mais avait disparu en prod.
17. **Phase 5 — Backend booking details** (29 avril 2026, commit `261beb3`) : `GET /api/bookings/[id]` enrichi (booking + customer + property + quote). `GET /api/calendar/events` enrichi avec `customer_name`, `booking_id`, `quote_id` (no N+1, batched fetch).
18. **Phase 5 — Booking details modal sur calendrier** (29 avril 2026, commit `ae93431`) : composant `<BookingDetailsModal>` créé et branché dans `calendar-view.tsx`. Barres dashify affichent maintenant le **nom du client** (ex: "Cheikh Fall") au lieu de "Réservation" générique. Clic sur barre → modal avec photo cover, infos client (tél/email), séjour, paiement (montant + méthode + référence DSHF copiable), bouton WhatsApp, bouton Annuler. Annulation = `PATCH /api/bookings/[id]` → trigger DB nettoie auto + refetch calendar. `next.config.mjs` whitelist Supabase Storage pour `next/image`.

---

## 6. PHASES SUIVANTES (ORDRE)

1. **Prospection** — **DÉBLOQUÉE depuis 24 avril 2026** : domaine pro + email pro + PDF cohérent. Calendrier avec noms clients = vrai atout en démo commerciale (depuis 29 avril 2026). Jimmy peut envoyer le PDF/guide aux 20 prospects sans risque de crédibilité.

2. **Phase 3 — Facturation abonnement Dashify** — **EN ATTENTE** :
   - Décision business prise (plan Security + Strategy combiné) : pas de PayDunya tant que pas de NINEA, pré-paration APIX cette semaine, facturation manuelle Mobile Money sur les 2-3 premiers clients
   - Trigger pour créer l'EI : 1 conciergerie qui veut facture NINEA OU 3 particuliers confirmés OU MRR ~100k FCFA
   - Code Phase 3 LITE à faire quand on aura 3-5 clients : page `/dashboard/billing` read-only pour affichage factures + bouton "Marquer payé" manuel
   - Code Phase 3 FULL (PayDunya webhook + checkout automatique) à faire quand NINEA obtenu

3. **Phase 5 — Quality of life** (backlog, ordre non défini) :
   - Mode démo activable (si démos fréquentes = utile)
   - Photos en création logement (actuellement seulement en édition)
   - Vérifier le chemin `redirect("/auth/login")` dans `app/(dashboard)/dashboard/properties/[id]/edit/page.tsx`
   - Petit dashboard admin interne pour lire les `contact_tickets` (vs Supabase Table Editor) — optionnel
   - Notif email sur nouveau ticket contact (Resend) — quand volume >5/semaine
   - Migrer de Cloudflare Email Routing (forward only) vers Zoho Mail Free (send + receive) quand les prospects attendent un vrai "from contact@dashify.africa" dans leurs réponses
   - **Booking details modal — raffinements** : remettre les accents français (`Détails`, `Réservation`, `Séjour` au lieu de `Details`, `reservation`, `Sejour`). Faire via PowerShell + `[System.IO.File]::WriteAllText` UTF-8 sans BOM, **pas par copy-paste Cursor**.
   - Ajout colonne `quote_id` sur `bookings` (FK vers `quotes`) pour rendre le lookup explicite — optimisation perf si un jour la query devient lente. Pas urgent.
   - Activer vraiment l'import iCal (UI livrée mais aucun import effectif au 29 avril 2026) — le jour où un design partner aura un vrai Airbnb actif à brancher
   - **Paiement par carte** sur page `/pay/[reference]` (post-EI) : via PayDunya hosted checkout. Trigger = KYC NINEA fait + ≥3 prospects qui demandent explicitement "vous prenez la carte ?". Stripe/PayPal/Paystack tous indispo merchant SN, PayDunya = voie réaliste. Plan : 4ème option sur la page, webhook `/api/webhooks/paydunya` idempotent, réutilise flow `accepted` + booking existant. ~1 journée dev.

### Bugs / dettes connues
- **Supabase Free plan** : pas de backups auto, à passer en Pro au premier client payant (25$/mois)
- **Colonne `updated_at` manquante** sur `bookings` — code existant fait sans, pas bloquant. À ajouter quand on en aura besoin (le standard `set_updated_at()` est posé, ce sera 5 min de migration).
- **Colonne `quote_id` manquante** sur `bookings` — le lookup quote ↔ booking dans `GET /api/bookings/[id]` se fait par jointure (customer_id + property_id + dates + status='accepted'). Marche très bien aujourd'hui mais une FK explicite serait plus propre.
- **Channel Manager iCal** : UI livrée + table `calendar_events` prête, **aucun import réel jamais effectué en prod** au 29 avril 2026. À retester quand un design partner aura un Airbnb actif.
- **Rate limiting `/api/contact`** : stockage Map en mémoire, reset à chaque cold start Vercel. Suffisant tant que volume < 100/jour.
- **Email Routing Cloudflare** = forward only : Jimmy peut recevoir sur `contact@dashify.africa` mais ses réponses partiront depuis `khaterjimmy@gmail.com`. À migrer si ça devient un sujet commercial.
- **Modal `BookingDetailsModal` sans accents** : labels en français mais sans diacritiques (`reservation`, `details`, `Sejour`) pour éviter les bugs d'encoding rencontrés au moment de la création. Marche bien, juste moins joli. À fixer en backlog Phase 5.

### Décisions techniques à retenir

- **Architecture paiement — Chemin 3 validée (Option A+)** : Dashify ne stocke PAS les fonds. Chaque hôte renseigne son numéro OM/Wave/FM dans Settings → le client paie directement l'hôte → l'hôte clique "Marquer comme payé". Zéro intermédiation, zéro risque BCEAO, zéro KYC imposé.

- **CinetPay abandonné** : bloqué par incompatibilité IP whitelist vs Vercel serverless (code 2011 NOT_ALLOWED).

- **PayDunya conservé mais inactif** : compte Business BSN1794937332 activé mais **KYC Sénégal NON FAIT** (Jimmy est particulier sans NINEA/RCCM). Trigger EI : 1er signal d'achat pro sérieux.

- **Stripe / PayPal / Paystack tous indisponibles pour merchant SN** (vérifié 29 avril 2026) : Stripe ne supporte pas Sénégal sauf via Stripe Atlas LLC US ($500+). PayPal SN = "send only" (pas de réception merchant). Paystack couvre Nigeria/SA/Ghana/Kenya/CI mais pas Sénégal. **Conclusion** : PayDunya reste la voie réaliste pour les cartes au Sénégal, conditionnée à NINEA.

- **Bug Postgres `uuid ~~ unknown`** : résolu en Phase 2 Palier 3 en ajoutant une colonne `payment_reference` text dédiée au lieu de faire `.like("id", ...)` sur un uuid.

- **Bug useState multiligne avec generics au copier-coller Cursor** : fix via version inline single-line.

- **RLS publique sur `quotes`/`properties`/`profiles`** : policies élargies pour autoriser lecture des devis `status='sent' OR (status='accepted' AND payment_confirmed_at IS NOT NULL)`. Garantit que le lien WhatsApp `/pay/DSHF-XXXX` reste utile après confirmation.

- **Convention path Supabase Storage `property-photos`** : **`{user_id}/{propertyId}/{timestamp}-{filename}.{ext}`**. Le premier dossier DOIT être user_id pour matcher la RLS.

- **Photo UX — swap cover↔galerie bidirectionnel** : un seul UPDATE SQL atomique. Composant React utilise la réponse API comme source de vérité.

- **Form contact public — sécurité en couches** : validation serveur, rate limiting Map mémoire, IP hashée SHA-256, détection spam, service_role pour bypass RLS INSERT.

- **Config DNS `dashify.africa`** : nameservers Cloudflare, records A/CNAME en DNS only (nuage gris). Vercel gère son SSL Let's Encrypt.

- **Email Routing Cloudflare** : MX + DKIM + SPF auto-générés. `contact@dashify.africa` → `khaterjimmy@gmail.com`. Catch-all disabled.

- **Maintenance sécurité Vercel (22 avril 2026)** : migration Supabase legacy JWT → `sb_publishable_*` + `sb_secret_*`. `SUPABASE_SERVICE_ROLE_KEY` ajoutée Sensitive. Code CinetPay supprimé.

- **Rotation clé service_role (24 avril 2026)** : `sb_secret_plLDoZms...` → `dashify_main` suite à exposition dans un screenshot. Pas d'évidence d'usage abusif.

- **Produits Namecheap désactivés** : PremiumDNS off, Stellar Web Hosting off (auto-renew off pour les deux). Domain auto-renew ON. Domain Privacy Free Forever.

- **Standard `updated_at` unifié sur `public.set_updated_at()`** (29 avril 2026) : 4 tables sur la même fonction. Pour toute future table avec `updated_at`, réutiliser. Ne pas toucher à `storage.update_updated_at_column()` qui appartient à Supabase.

- **Trigger DB `sync_booking_to_calendar_event_trigger`** (29 avril 2026) : maintient `calendar_events` automatiquement à partir de `bookings`. Convention `external_uid='booking:<uuid>'`, `source='dashify'`. Le contrat équivalent côté code app (le PATCH `confirm_payment` qui crée la booking) n'a PAS besoin d'écrire dans `calendar_events` lui-même — le trigger s'en charge. Pattern DELETE-then-INSERT idempotent.

- **Convention `external_uid` sur `calendar_events`** : `booking:<uuid>` pour les events Dashify, `quote:<uuid>` pour les holds de devis. Le frontend `calendar-view.tsx` parse ce préfixe pour distinguer les sources cliquables (booking) des non-cliquables (quote_hold filtrés côté client de toute façon).

- **`next.config.mjs` `images.remotePatterns`** : whitelist `isonhkrnwuhgwhfkumus.supabase.co/storage/v1/object/public/**` ajoutée 29 avril 2026 pour permettre `next/image` sur les photos de logements. Si nouveau bucket Supabase ou nouveau domaine d'images dans le futur, l'ajouter ici (sinon `Invalid src prop ... hostname not configured`).

- **Anti-pattern "deux dossiers calendar/"** : il existe `app/(dashboard)/calendar/` (vrai code) et `app/(dashboard)/dashboard/calendar/` (juste un redirect). Toujours travailler sur le premier.

---

## 7. POSITIONNEMENT COMMERCIAL

### Cibles (priorité décroissante)
1. **Hôte particulier** avec 1 à 3 logements Airbnb à Dakar — **attaquer EN PREMIER** (zéro friction NINEA, cycle court)
2. **Petit pro / micro-conciergerie** avec 5 à 20 logements — **attaquer EN DEUXIÈME** (exigence facture NINEA, déclenche création EI)

### Pricing
**10 000 FCFA / logement / mois TTC**, sans engagement.
Exemple : conciergerie 10 logements = 100 000 FCFA/mois (~152 €).
Pas de "HT" qui trouble les particuliers. TVA absorbée dans la marge si un jour basculement en régime réel.

### Stratégie design partners (décidée par Strategy)
3-5 hôtes hand-picked → 3 mois gratuits contre :
- Call feedback hebdo 30 min
- Témoignage écrit + photo + autorisation publier
- Engagement WhatsApp écrit de passer payant en M4
- Critère strict : uniquement ceux qui ont dit "je paierais pour ça si ça existait"

Après design partners : tarif plein 10k, trial 30j standard, zéro remise.

### Framing Mobile Money direct (pour premiers clients sans PayDunya auto)
✅ Bon : "Tu reçois une facture chaque mois, tu paies en Wave à ce numéro. Simple, direct, sans intermédiaire. C'est exactement ce que Dashify fait faire à tes propres clients."
❌ Mauvais : "Pour l'instant on fait ça en Wave, le système auto arrive bientôt."

### Ton de marque
**Mix chaleureux-proche + fierté africaine.**
- Tutoiement, phrases courtes, touche d'humour local
- FCFA partout (pas d'euros sauf conversion pédagogique)
- Références culturelles SN assumées (Tabaski, Magal, saison touristique, WhatsApp)
- Anglicismes tech OK mais traduits si utile
- Pas de corporate-speak, pas de "leverage", pas de "synergie"

---

## 8. DEADLINE ET KPIs

**Deadline personnelle : 6 mois pour 20 clients payants minimum.** (≈ 3,3 clients / mois)

### KPIs à tracker hebdo
- **Nombre de démos faites / semaine** ← métrique la plus importante
- Nombre de clients payants actifs
- MRR (FCFA)
- Nombre de devis créés / semaine dans l'app
- Taux de conversion devis → paiement
- Taux de démo → signature

### Métriques produit nice-to-have
- Uptime Vercel + Supabase
- Temps moyen de réponse API
- Taux de confirmation manuelle de paiement (% hôtes qui cliquent bien "Marquer comme payé")
- Nombre de `contact_tickets` reçus / semaine

---

## 9. CONVENTIONS DE COLLABORATION AVEC LES AGENTS

- Chaque agent consulte ce fichier en début de session
- Si une info manque, l'agent **demande** avant d'inventer
- Toute décision structurante (pricing, feature, techno) → Jimmy met à jour ce fichier
- Agents ne se contredisent pas : en cas de doute, référer à ce fichier ou demander arbitrage
- L'agent Dev utilise systématiquement `-LiteralPath` dans PowerShell quand des chemins contiennent `[...]` ou `(...)` (important pour les fichiers avec `(1).pdf`, `(dashboard)`, `[id]`, etc.)
- L'agent Dev reste **strictement dans son périmètre technique**. Questions business/marketing/sales → Strategy. Conformité légale/fiscalité → Security.
- **Quand l'agent Dev livre un fichier .tsx >100 lignes ou contenant des accents** : préférer la méthode PowerShell here-string + `[System.IO.File]::WriteAllText` UTF-8 sans BOM, pas le copy-paste dans Cursor (vécu 29 avril 2026, 1h perdue sur des bugs d'encoding et de balises mangées).
- **Quand l'agent Dev livre un test SQL avec placeholder `<XXX>`** : livrer aussi la version pré-remplie avec un id réel (les placeholders sont oubliés régulièrement).

---

## 10. DÉCISIONS STRATÉGIQUES ACTIVES (29 avril 2026)

**Statut juridique de Jimmy** : particulier au Sénégal, pas de NINEA/RCCM.

**Plan facturation** (combinaison Security + Strategy) :
1. **Phase A — maintenant → 2-3 premiers clients** : facturation manuelle Mobile Money (Wave / OM direct sur numéro perso Jimmy). Dashify n'a PAS de code Phase 3 actif. Attaquer d'abord les particuliers (zéro friction NINEA).
2. **Phase B — pré-préparation APIX** : dossier monté cette semaine (pièces, activité déclarée "édition logiciels", domiciliation adresse perso). Pas de paiement tant que pas de trigger.
3. **Trigger création EI** : 1 conciergerie verbalise "je signe si facture NINEA" OU 3 particuliers confirmés (deposit/engagement WhatsApp) OU MRR cumulé ~100k FCFA imminent.
4. **Phase C — EI créée** : budget immédiat ~30k FCFA (APIX seul). Pas d'expert-comptable avant 15-20 clients. Pas de RC Pro avant qu'une conciergerie l'exige.
5. **Phase D — PayDunya auto** : quand 5-8 clients payants (collecte manuelle trop chronophage). ~3 mois max avant de coder Phase 3 FULL (webhook + checkout).

**Checklist à date** :
- [x] Finir Phase 2 Paliers 4-5-6 (✅ fait)
- [x] Phase 4 Chantier 2 Upload photos (✅ commit `aaf01cd`)
- [x] Phase 4 Chantier 3 Page /contact (✅ commit `40c2af1`)
- [x] Rotation `SUPABASE_SERVICE_ROLE_KEY` (✅ 24 avril 2026)
- [x] Chantier domaine + DNS + email pro (✅ 24 avril 2026)
- [x] Refresh PDF iCal (✅ 24 avril 2026)
- [x] Phase 5 calendrier — colonne `properties.updated_at` + standard `set_updated_at()` (✅ 29 avril 2026)
- [x] Phase 5 calendrier — colonne `bookings.source` (✅ 29 avril 2026)
- [x] Phase 5 calendrier — trigger sync `bookings` ↔ `calendar_events` (✅ 29 avril 2026, commit `261beb3`)
- [x] Phase 5 calendrier — backend booking details (commits `261beb3` + `ae93431`) (✅ 29 avril 2026)
- [x] Phase 5 calendrier — frontend booking details modal sur barres (✅ 29 avril 2026, commit `ae93431`)
- [ ] Réunir pièces APIX (2h, sans payer)
- [ ] Lister 20 prospects (15 particuliers Airbnb Dakar + 5 conciergeries)
- [ ] Drafter scripts WhatsApp de prospection
- [ ] Sélectionner 3-5 candidats design partners
- [ ] Envoyer 10 WhatsApp de prospection

---

## 11. ÉTAT AU MOMENT DU SWITCH DE CONVERSATION (29 avril 2026, fin de matinée)

**Session 28-29 avril : grosse session technique Phase 5 calendrier bouclée en deux temps.** 🎉

**28 avril (soir)** : préparation backend
- Migration SQL `properties.updated_at` + standard `set_updated_at()` unifié sur 4 tables
- Migration SQL `bookings.source` avec CHECK 6 valeurs et index
- Migration SQL trigger `sync_booking_to_calendar_event_trigger` + backfill 3 démos
- API `GET /api/bookings/[id]` enrichi (booking + customer + property + quote, no N+1)
- API `GET /api/calendar/events` enrichi (customer_name, booking_id, quote_id)
- Composant `booking-details-modal.tsx` créé via PowerShell (méthode UTF-8 sans BOM, après 1h de galère sur le copy-paste Cursor)
- Push commit `261beb3` — tout backend, frontend pas branché donc zéro risque utilisateur

**29 avril (matin)** : finition frontend
- Modifs ciblées dans `calendar-view.tsx` (5 modifs structurelles : type élargi, import modal, state selectedBookingId, weekSegments avec bookingId/customerName + filtre quote_hold, rendu cliquable des barres + label dynamique, modal monté en bas du JSX)
- Bug `next/image` détecté en local : ajout `images.remotePatterns` dans `next.config.mjs` pour whitelister `isonhkrnwuhgwhfkumus.supabase.co`
- Test local validé sur démo Cheikh Fall (Studio Yoff plage, 25-28 avril 2026) : barre teal "Cheikh Fall" + clic = modal complet
- Push commit `ae93431` en prod

**Tout validé en prod** :
- ✅ Migrations DB appliquées sur Supabase
- ✅ APIs enrichies déployées
- ✅ Calendrier en prod affiche le **nom du client** sur les barres dashify
- ✅ Clic sur barre → modal avec photo cover, infos client, séjour, paiement, bouton Annuler
- ✅ Annulation → trigger DB nettoie le calendar_event automatiquement → barre disparaît du calendrier

**Découvertes importantes de la session, intégrées dans ce contexte** :
1. Le trigger `trg_booking_calendar` documenté dans l'ancien contexte avait disparu en prod (audit 29 avril 2026 a montré 0 trigger sur `bookings`). Le nouveau `sync_booking_to_calendar_event_trigger` rétablit le comportement attendu.
2. **Deux dossiers `calendar/`** existent dans `app/(dashboard)/`. Le vrai code est dans `app/(dashboard)/calendar/`, pas `app/(dashboard)/dashboard/calendar/`.
3. **Stripe / PayPal / Paystack tous indispo pour merchant SN** — confirmé par recherche web. PayDunya reste la voie réaliste, conditionnée à NINEA.
4. **Bug copy-paste Cursor** sur fichiers .tsx : markdown auto-conversion + encoding Windows-1252 + balises ouvrantes mangées. Solution = PowerShell + here-string + UTF-8 sans BOM. Ajouté en convention agents.

**Prochaine session — options par priorité business** :
- **Option prospection (recommandée)** : préparer les 20 prospects, drafter messages WhatsApp, sélectionner 3-5 design partners. Plus rien ne bloque côté tech, et le calendrier avec noms clients = vrai atout en démo commerciale.
- **Option APIX** : préparer le dossier (pièces, activité, adresse) sans payer tant qu'il n'y a pas de trigger business.
- **Option dev raffinements** : remettre les accents français dans le modal `BookingDetailsModal` (`Détails`, `Réservation`, `Séjour`...) via PowerShell. Ajout colonne `bookings.updated_at` (5 min, le standard est posé). Mode démo. Photos en création logement. Tous low-prio.

**Pièges à garder en tête pour l'agent Dev de la prochaine session** :
- `Get-ChildItem` + `Copy-Item` PowerShell avec parenthèses dans le nom : `-LiteralPath` obligatoire
- Fichiers .tsx >100 lignes : **toujours** PowerShell + here-string + UTF-8 sans BOM, jamais copy-paste dans Cursor
- Placeholders `<XXX>` dans les SQL : pré-remplir avec un vrai id quand possible
- Modifier `next.config.mjs` : restart `npm run dev` obligatoire (pas de hot-reload)
- Cursor peut afficher un fichier en mémoire qui n'existe pas sur disque (vérifier avec `Get-ChildItem` PowerShell, pas se fier à l'arborescence Cursor)