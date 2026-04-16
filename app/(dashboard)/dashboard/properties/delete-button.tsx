"use client";

import { TrashIcon } from "@heroicons/react/24/outline";

export function DeleteButton({
  action,
  confirmMessage = "Supprimer ce logement ? Cette action est irréversible.",
}: {
  action: () => void | Promise<void>;
  confirmMessage?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800"
      >
        <TrashIcon className="h-5 w-5 text-red-300" />
        Supprimer
      </button>
    </form>
  );
}

