"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { AMENITIES_LIST } from "./property-constants";
import type { PropertyFormState } from "./actions";

const initialState: PropertyFormState = { ok: false };

function fieldError(state: PropertyFormState | undefined, name: string) {
  return state?.fieldErrors?.[name as keyof NonNullable<PropertyFormState["fieldErrors"]>];
}

type PropertyFormValues = {
  name?: string | null;
  city?: string | null;
  base_price?: number | null;
  cleaning_fee?: number | null;
  currency?: "XOF" | "EUR" | "USD" | null;
  description?: string | null;
  internal_name?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  property_type?: string | null;
  surface_m2?: number | null;
  max_guests?: number | null;
  bedrooms?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
  amenities?: string[] | null;
};

function numToStr(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function PropertyForm({
  title,
  description,
  submitLabel,
  action,
  defaultValues,
  dangerZone,
}: {
  title: string;
  description?: string;
  submitLabel: string;
  action: (prevState: PropertyFormState, formData: FormData) => Promise<PropertyFormState>;
  defaultValues?: PropertyFormValues;
  dangerZone?: React.ReactNode;
}) {
  const [state, formAction] = useFormState(action, initialState);
  const selectedAmenities = new Set(defaultValues?.amenities ?? []);

  // Grouper les équipements par catégorie
  const amenitiesByCategory: Record<string, typeof AMENITIES_LIST[number][]> = {};
  for (const a of AMENITIES_LIST) {
    if (!amenitiesByCategory[a.category]) amenitiesByCategory[a.category] = [];
    amenitiesByCategory[a.category].push(a);
  }

  const inputCls =
    "mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2";
  const labelCls = "text-sm font-medium text-gray-200";
  const sectionCls = "rounded-xl border border-gray-700 bg-gray-800/80 p-6 shadow-sm";
  const sectionTitleCls = "text-base font-semibold text-white";
  const sectionSubtitleCls = "mt-0.5 text-xs text-gray-400";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      </div>

      <form action={formAction} className="space-y-6">
        {state.message && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {state.message}
          </div>
        )}

        {/* SECTION 1 : Aperçu */}
        <section className={sectionCls}>
          <h2 className={sectionTitleCls}>Aperçu</h2>
          <p className={sectionSubtitleCls}>Nom et description affichés aux clients.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="name">
                Nom <span className="text-teal-400">*</span>
              </label>
              <input
                id="name"
                name="name"
                required
                defaultValue={defaultValues?.name ?? ""}
                className={inputCls}
                placeholder="ex: Villa Almadies vue mer"
              />
              {fieldError(state, "name") && (
                <p className="mt-1 text-xs text-red-200">{fieldError(state, "name")}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="internal_name">
                Nom interne <span className="text-gray-500">(optionnel)</span>
              </label>
              <input
                id="internal_name"
                name="internal_name"
                defaultValue={defaultValues?.internal_name ?? ""}
                className={inputCls}
                placeholder="ex: Almadies-01"
              />
              <p className="mt-1 text-xs text-gray-500">
                Uniquement visible par vous. Utile si vous gérez plusieurs logements similaires.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={defaultValues?.description ?? ""}
                className={inputCls}
                placeholder="Décrivez votre logement : ambiance, points forts, environnement..."
              />
            </div>
          </div>
        </section>

        {/* SECTION 2 : Caractéristiques */}
        <section className={sectionCls}>
          <h2 className={sectionTitleCls}>Caractéristiques</h2>
          <p className={sectionSubtitleCls}>Type, surface et capacité d&apos;accueil.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="property_type">
                Type de logement
              </label>
              <select
                id="property_type"
                name="property_type"
                defaultValue={defaultValues?.property_type ?? ""}
                className={inputCls}
              >
                <option value="">— Sélectionner —</option>
                <option value="appartement">Appartement</option>
                <option value="villa">Villa</option>
                <option value="studio">Studio</option>
                <option value="bungalow">Bungalow</option>
                <option value="maison">Maison</option>
                <option value="chambre">Chambre</option>
              </select>
            </div>

            <div>
              <label className={labelCls} htmlFor="surface_m2">
                Surface (m²)
              </label>
              <input
                id="surface_m2"
                name="surface_m2"
                type="number"
                min="0"
                max="10000"
                defaultValue={numToStr(defaultValues?.surface_m2)}
                className={inputCls}
                placeholder="ex: 80"
              />
              {fieldError(state, "surface_m2") && (
                <p className="mt-1 text-xs text-red-200">{fieldError(state, "surface_m2")}</p>
              )}
            </div>

            <div>
              <label className={labelCls} htmlFor="max_guests">
                Capacité max (voyageurs)
              </label>
              <input
                id="max_guests"
                name="max_guests"
                type="number"
                min="1"
                max="50"
                defaultValue={numToStr(defaultValues?.max_guests)}
                className={inputCls}
                placeholder="ex: 4"
              />
              {fieldError(state, "max_guests") && (
                <p className="mt-1 text-xs text-red-200">{fieldError(state, "max_guests")}</p>
              )}
            </div>

            <div>
              <label className={labelCls} htmlFor="bedrooms">
                Chambres
              </label>
              <input
                id="bedrooms"
                name="bedrooms"
                type="number"
                min="0"
                max="50"
                defaultValue={numToStr(defaultValues?.bedrooms)}
                className={inputCls}
                placeholder="ex: 2"
              />
              {fieldError(state, "bedrooms") && (
                <p className="mt-1 text-xs text-red-200">{fieldError(state, "bedrooms")}</p>
              )}
            </div>

            <div>
              <label className={labelCls} htmlFor="beds">
                Lits
              </label>
              <input
                id="beds"
                name="beds"
                type="number"
                min="0"
                max="50"
                defaultValue={numToStr(defaultValues?.beds)}
                className={inputCls}
                placeholder="ex: 3"
              />
              {fieldError(state, "beds") && (
                <p className="mt-1 text-xs text-red-200">{fieldError(state, "beds")}</p>
              )}
            </div>

            <div>
              <label className={labelCls} htmlFor="bathrooms">
                Salles de bain
              </label>
              <input
                id="bathrooms"
                name="bathrooms"
                type="number"
                min="0"
                max="50"
                step="0.5"
                defaultValue={numToStr(defaultValues?.bathrooms)}
                className={inputCls}
                placeholder="ex: 1.5"
              />
              {fieldError(state, "bathrooms") && (
                <p className="mt-1 text-xs text-red-200">{fieldError(state, "bathrooms")}</p>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 3 : Emplacement */}
        <section className={sectionCls}>
          <h2 className={sectionTitleCls}>Emplacement</h2>
          <p className={sectionSubtitleCls}>Ville, quartier et adresse précise.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="city">
                Ville
              </label>
              <input
                id="city"
                name="city"
                defaultValue={defaultValues?.city ?? ""}
                className={inputCls}
                placeholder="ex: Dakar"
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="neighborhood">
                Quartier
              </label>
              <input
                id="neighborhood"
                name="neighborhood"
                defaultValue={defaultValues?.neighborhood ?? ""}
                className={inputCls}
                placeholder="ex: Almadies, Point E, Mermoz..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="address">
                Adresse complète
              </label>
              <input
                id="address"
                name="address"
                defaultValue={defaultValues?.address ?? ""}
                className={inputCls}
                placeholder="ex: Rue 10, Résidence Les Palmiers, Almadies"
              />
            </div>
          </div>
        </section>

        {/* SECTION 4 : Tarification */}
        <section className={sectionCls}>
          <h2 className={sectionTitleCls}>Tarification</h2>
          <p className={sectionSubtitleCls}>Prix de base et frais.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls} htmlFor="currency">
                Devise
              </label>
              <select
                id="currency"
                name="currency"
                defaultValue={defaultValues?.currency ?? "XOF"}
                className={inputCls}
              >
                <option value="XOF">XOF (F CFA)</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
              {fieldError(state, "currency") && (
                <p className="mt-1 text-xs text-red-200">{fieldError(state, "currency")}</p>
              )}
            </div>

            <div>{/* Spacer */}</div>

            <div>
              <label className={labelCls} htmlFor="base_price">
                Prix / nuit
              </label>
              <input
                id="base_price"
                name="base_price"
                inputMode="decimal"
                defaultValue={
                  defaultValues?.base_price === null || defaultValues?.base_price === undefined
                    ? ""
                    : String(defaultValues.base_price)
                }
                className={inputCls}
                placeholder="ex: 25000"
              />
              {fieldError(state, "base_price") && (
                <p className="mt-1 text-xs text-red-200">{fieldError(state, "base_price")}</p>
              )}
            </div>

            <div>
              <label className={labelCls} htmlFor="cleaning_fee">
                Frais de ménage
              </label>
              <input
                id="cleaning_fee"
                name="cleaning_fee"
                inputMode="decimal"
                defaultValue={
                  defaultValues?.cleaning_fee === null || defaultValues?.cleaning_fee === undefined
                    ? ""
                    : String(defaultValues.cleaning_fee)
                }
                className={inputCls}
                placeholder="ex: 5000"
              />
              {fieldError(state, "cleaning_fee") && (
                <p className="mt-1 text-xs text-red-200">{fieldError(state, "cleaning_fee")}</p>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 5 : Équipements */}
        <section className={sectionCls}>
          <h2 className={sectionTitleCls}>Équipements</h2>
          <p className={sectionSubtitleCls}>Cochez tout ce que votre logement propose.</p>

          <div className="mt-5 space-y-5">
            {Object.entries(amenitiesByCategory).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {category}
                </h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {items.map((a) => {
                    const checked = selectedAmenities.has(a.id);
                    return (
                      <label
                        key={a.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2.5 hover:border-teal-500/50 hover:bg-gray-900"
                      >
                        <input
                          type="checkbox"
                          name="amenities"
                          value={a.id}
                          defaultChecked={checked}
                          className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-teal-500 focus:ring-2 focus:ring-teal-500/20"
                        />
                        <span className="text-sm text-gray-200">{a.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/dashboard/properties"
            className="inline-flex items-center justify-center rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-gray-800"
          >
            Annuler
          </Link>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-teal-400"
          >
            {submitLabel}
          </button>
        </div>

        {dangerZone}
      </form>
    </div>
  );
}