/**
 * Abgestimmt auf project-shop (lib/design-classes.ts) – einheitliche Rahmen/Inputs.
 */
export const BORDER = "border";

export const INNER_FORM_CLASS = `rounded-lg ${BORDER} border-gray-300 bg-white p-6 space-y-4 shadow-sm`;

/** Info / Erfolg / Fehler – analog zu abgesetzten Hinweisen in Manage-Einstellungen. */
export const INFO_BANNER_CLASS = `rounded-lg ${BORDER} border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900`;

export const SUCCESS_BANNER_CLASS = `rounded-lg ${BORDER} border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800`;

export const ERROR_BANNER_CLASS = `rounded-lg ${BORDER} border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800`;

const INPUT_CLASS_BASE = `px-3 py-2 text-sm text-gray-900 bg-white ${BORDER} border-gray-400 rounded-lg placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-70`;

export const INPUT_CLASS = `w-full ${INPUT_CLASS_BASE}`;

/** Primärbutton wie in project-shop Einstellungen (Integrationen). */
export const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 bg-gray-800 text-white hover:bg-gray-700 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60";
