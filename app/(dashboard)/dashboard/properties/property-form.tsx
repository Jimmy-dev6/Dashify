"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import type { PropertyFormState } from "./actions";

const initialState: PropertyFormState = { ok: false };

function fieldError(state: PropertyFormState | undefined, name: string) {
  return state?.fieldErrors?.[name as keyof NonNullable<PropertyFormState["fieldErrors"]>];
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
  defaultValues?: {
    name?: string | null;
    city?: string | null;
    base_price?: number | null;
    cleaning_fee?: number | null;
    currency?: "XOF" | "EUR" | "USD" | null;
  };
  dangerZone?: React.ReactNode;
}) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <div className="mx-auto max-w-2xl">
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

        <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-200" htmlFor="name">
                Nom <span className="text-teal-400">*</span>
              </label>
              <input
                id="name"
                name="name"
                required
                defaultValue={defaultValues?.name ?? ""}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
              />
              {fieldError(state, "name") && (
                <p className="mt-1 text-xs text-red-200">{fieldError(state, "name")}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-200" htmlFor="city">
                Ville
              </label>
              <input
                id="city"
                name="city"
                defaultValue={defaultValues?.city ?? ""}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-200" htmlFor="currency">
                Devise
              </label>
              <select
                id="currency"
                name="currency"
                defaultValue={defaultValues?.currency ?? "XOF"}
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
              >
                <option value="XOF">XOF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
              {fieldError(state, "currency") && (
                <p className="mt-1 text-xs text-red-200">
                  {fieldError(state, "currency")}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-200" htmlFor="base_price">
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
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
                placeholder="ex: 25000"
              />
              {fieldError(state, "base_price") && (
                <p className="mt-1 text-xs text-red-200">
                  {fieldError(state, "base_price")}
                </p>
              )}
            </div>

            <div>
              <label
                className="text-sm font-medium text-gray-200"
                htmlFor="cleaning_fee"
              >
                Frais de ménage
              </label>
              <input
                id="cleaning_fee"
                name="cleaning_fee"
                inputMode="decimal"
                defaultValue={
                  defaultValues?.cleaning_fee === null ||
                  defaultValues?.cleaning_fee === undefined
                    ? ""
                    : String(defaultValues.cleaning_fee)
                }
                className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none ring-teal-500/20 focus:border-teal-500 focus:ring-2"
                placeholder="ex: 5000"
              />
              {fieldError(state, "cleaning_fee") && (
                <p className="mt-1 text-xs text-red-200">
                  {fieldError(state, "cleaning_fee")}
                </p>
              )}
            </div>
          </div>
        </div>

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

